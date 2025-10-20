import requests
import json

# --- Direct Replication of your cURL command ---
# Hardcode the exact values to ensure a perfect match.
url = 'https://n8dev.automagicians.io/api/v1/workflows?active=true'
api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MGY1MzhmOS0zMDI4LTQyMTctOWRhNS01Yjg5MzMyNDVkYzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjQxMjk3fQ.ZQwgkFyax4awHIoDExEUrKegZ51HYzkh7ki1QbToEl8'

# Impersonate the User-Agent of a standard command-line tool.
headers = {
    'X-N8N-API-KEY': api_key,
    'User-Agent': 'curl/8.4.0' # Match the curl user agent
}

print("--- Running Standalone Test Script ---" )
print(f"Requesting URL: {url}")

try:
    # Make the request
    response = requests.get(url, headers=headers)
    
    # Check if the request was successful
    response.raise_for_status()
    
    # Parse the JSON data
    data = response.json()
    
    # Extract the list of workflows from the 'data' key
    workflows = data.get('data', [])
    
    print(f"\nSUCCESS: API call successful. Found {len(workflows)} workflows in the 'data' array.")
    
    # Print the names of all found workflows
    if workflows:
        print("\n--- Workflow Names ---")
        for i, wf in enumerate(workflows):
            print(f"{i + 1}. {wf.get('name', 'N/A')}")
        print("----------------------")
    else:
        print("\nWarning: The 'data' array in the response was empty.")

except requests.exceptions.HTTPError as http_err:
    print(f"\nERROR: HTTP Error occurred: {http_err}" )
    print(f"Status Code: {http_err.response.status_code}" )
    print(f"Response Body: {http_err.response.text}" )
except Exception as err:
    print(f"\nERROR: An other error occurred: {err}")

