import os
import requests
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

SOURCE_N8N_URL = os.getenv("SOURCE_N8N_URL")
SOURCE_API_KEY = os.getenv("SOURCE_API_KEY")
DESTINATION_N8N_URL = os.getenv("DESTINATION_N8N_URL")
DESTINATION_API_KEY = os.getenv("DESTINATION_API_KEY")

if not all([SOURCE_N8N_URL, SOURCE_API_KEY, DESTINATION_N8N_URL, DESTINATION_API_KEY]):
    raise ValueError("One or more environment variables are missing. Please check your .env file.")

app = FastAPI()

@app.get("/api/workflows")
def get_source_workflows():
    headers = {"X-N8N-API-KEY": SOURCE_API_KEY}
    base_url = SOURCE_N8N_URL.rstrip('/')
    api_url = f"{base_url}/api/v1/workflows?active=true&excludePinnedData=true"

    try:
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        
        response_data = response.json()
        all_workflows = response_data.get("data", [])
        
        if not isinstance(all_workflows, list):
            raise HTTPException(status_code=500, detail="API response 'data' key is not a list.")

        filtered_workflows = [
            {
                "id": wf.get("id"),
                "name": wf.get("name"),
            }
            for wf in all_workflows
            if isinstance(wf, dict)
        ]
        
        return filtered_workflows

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching workflows from source: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@app.get("/api/workflow/{workflow_id}")
def get_workflow_details(workflow_id: str):
    headers = {"X-N8N-API-KEY": SOURCE_API_KEY}
    base_url = SOURCE_N8N_URL.rstrip('/')
    api_url = f"{base_url}/api/v1/workflows/{workflow_id}"

    try:
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()
        
        workflow_data = response.json()
        
        cleaned_workflow = {
            "name": workflow_data.get("name"),
            "nodes": workflow_data.get("nodes", []),
            "connections": workflow_data.get("connections", {}),
            "settings": workflow_data.get("settings", {}),
            "staticData": workflow_data.get("staticData", {})
        }
        
        return {
            "original": workflow_data,
            "cleaned": cleaned_workflow
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching workflow details: {e}")


@app.get("/api/check-destination/{workflow_id}")
def check_destination_workflow(workflow_id: str):
    headers = {"X-N8N-API-KEY": DESTINATION_API_KEY}
    base_url = DESTINATION_N8N_URL.rstrip('/')
    api_url = f"{base_url}/api/v1/workflows/{workflow_id}"

    try:
        response = requests.get(api_url, headers=headers)
        
        if response.status_code == 404:
            return {
                "exists": False,
                "message": "The workflow does not exist on the destination."
            }
        
        response.raise_for_status()
        
        workflow_data = response.json()
        nodes = workflow_data.get("nodes", [])
        
        special_notes = []
        current_revision_content = None
        
        for node in nodes:
            if node.get("type") == "n8n-nodes-base.stickyNote":
                node_name = node.get("name", "")
                if node_name == "Revision History":
                    current_revision_content = node.get("parameters", {}).get("content", "")
                    special_notes.append({
                        "name": node_name,
                        "parameters": node.get("parameters", {}),
                        "position": node.get("position", [])
                    })
        
        return {
            "exists": True,
            "workflow_id": workflow_id,
            "workflow_name": workflow_data.get("name"),
            "special_notes": special_notes,
            "current_revision_content": current_revision_content
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error checking destination workflow: {e}")


@app.post("/api/copy-workflow")
async def copy_workflow(request: Request):
    try:
        body = await request.json()
        workflow_data = body.get("workflow")
        workflow_id = body.get("workflow_id")
        is_update = body.get("is_update", False)
        reason = body.get("reason", "No reason provided")
        
        if not workflow_data:
            raise HTTPException(status_code=400, detail="Missing 'workflow' in request body")
        
        # Update the Revision History sticky note
        timestamp = datetime.utcnow().isoformat() + "Z"
        new_entry = f"* {timestamp}: {reason}"
        
        # Find and update the Revision History node
        nodes = workflow_data.get("nodes", [])
        for node in nodes:
            if node.get("type") == "n8n-nodes-base.stickyNote" and node.get("name") == "Revision History":
                current_content = node.get("parameters", {}).get("content", "")
                if current_content:
                    updated_content = current_content + "\n" + new_entry
                else:
                    updated_content = new_entry
                
                if "parameters" not in node:
                    node["parameters"] = {}
                node["parameters"]["content"] = updated_content
                break
        
        headers = {
            "X-N8N-API-KEY": DESTINATION_API_KEY,
            "Content-Type": "application/json"
        }
        
        base_url = DESTINATION_N8N_URL.rstrip('/')
        
        if is_update and workflow_id:
            api_url = f"{base_url}/api/v1/workflows/{workflow_id}"
            response = requests.put(api_url, headers=headers, json=workflow_data)
            action = "updated"
        else:
            api_url = f"{base_url}/api/v1/workflows"
            response = requests.post(api_url, headers=headers, json=workflow_data)
            action = "created"
        
        response.raise_for_status()
        
        result = response.json()
        return {
            "success": True,
            "message": f"Workflow {action} successfully",
            "action": action,
            "workflow": result
        }
        
    except requests.exceptions.RequestException as e:
        error_detail = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text
        raise HTTPException(status_code=500, detail=f"Error copying workflow: {error_detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@app.get("/")
async def read_index():
    return FileResponse("../frontend/index.html")

@app.get("/script.js")
async def read_script():
    return FileResponse("../frontend/script.js", media_type="application/javascript")

@app.get("/style.css")
async def read_style():
    return FileResponse("../frontend/style.css", media_type="text/css")

