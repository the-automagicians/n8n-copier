document.addEventListener('DOMContentLoaded', function() {
    var fetchBtn = document.getElementById('fetch-workflows-btn');
    var loader = document.getElementById('loader');
    var workflowListContainer = document.getElementById('workflow-list-container');
    var errorMessage = document.getElementById('error-message');

    var workflows = [];
    var currentCleanedWorkflow = null;
    var currentWorkflowId = null;
    var deploymentReason = '';
    var workflowExistsOnDestination = false;

    fetchBtn.addEventListener('click', function() {
        loader.style.display = 'block';
        fetchBtn.disabled = true;
        errorMessage.textContent = '';
        workflowListContainer.innerHTML = '';

        fetch('/api/workflows')
            .then(function(response) {
                if (!response.ok) {
                    return response.json().then(function(errorData) {
                        throw new Error(errorData.detail || 'Failed to fetch workflows.');
                    });
                }
                return response.json();
            })
            .then(function(data) {
                workflows = data;

                if (workflows.length === 0) {
                    workflowListContainer.innerHTML = '<p>No active workflows found to copy.</p>';
                } else {
                    var form = document.createElement('form');
                    form.id = 'workflow-form';

                    workflows.forEach(function(wf) {
                        var itemDiv = document.createElement('div');
                        itemDiv.className = 'workflow-item';

                        var radioInput = document.createElement('input');
                        radioInput.type = 'radio';
                        radioInput.name = 'workflow';
                        radioInput.value = wf.id;
                        radioInput.id = 'wf-' + wf.id;

                        var label = document.createElement('label');
                        label.htmlFor = 'wf-' + wf.id;
                        label.textContent = wf.name;
                        
                        itemDiv.onclick = function() {
                            radioInput.checked = true;
                        };

                        itemDiv.appendChild(radioInput);
                        itemDiv.appendChild(label);
                        form.appendChild(itemDiv);
                    });
                    
                    workflowListContainer.appendChild(form);

                    var reasonSection = document.createElement('div');
                    reasonSection.style.marginTop = '30px';
                    reasonSection.innerHTML = '<label for="deployment-reason" style="display: block; margin-bottom: 10px; font-weight: bold;">Deployment Reason (Required):</label><textarea id="deployment-reason" placeholder="Enter the reason for this deployment" style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: inherit; font-size: 14px;" required></textarea>';
                    workflowListContainer.appendChild(reasonSection);

                    var continueBtn = document.createElement('button');
                    continueBtn.textContent = 'Continue';
                    continueBtn.id = 'continue-btn';
                    continueBtn.style.marginTop = '20px';
                    continueBtn.onclick = handleContinue;
                    workflowListContainer.appendChild(continueBtn);
                }

                loader.style.display = 'none';
                fetchBtn.disabled = false;
            })
            .catch(function(error) {
                errorMessage.textContent = 'Error: ' + error.message;
                loader.style.display = 'none';
                fetchBtn.disabled = false;
            });
    });

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function handleContinue(e) {
        e.preventDefault();
        
        var selectedRadio = document.querySelector('input[name="workflow"]:checked');
        
        if (!selectedRadio) {
            errorMessage.textContent = 'Please select a workflow first.';
            return;
        }

        var reasonTextarea = document.getElementById('deployment-reason');
        var reason = reasonTextarea ? reasonTextarea.value.trim() : '';

        if (!reason) {
            errorMessage.textContent = 'Please enter a deployment reason.';
            reasonTextarea.focus();
            return;
        }

        deploymentReason = reason;
        var workflowId = selectedRadio.value;
        currentWorkflowId = workflowId;
        var workflowName = workflows.find(function(w) { return w.id === workflowId; }).name;

        loader.style.display = 'block';
        errorMessage.textContent = '';
        
        document.getElementById('initial-instruction').style.display = 'none';

        Promise.all([
            fetch('/api/workflow/' + workflowId).then(function(r) { return r.json(); }),
            fetch('/api/check-destination/' + workflowId).then(function(r) { return r.json(); })
        ])
        .then(function(results) {
            var data = results[0];
            var destData = results[1];

            currentCleanedWorkflow = data.cleaned;
            workflowExistsOnDestination = destData.exists;

            var originalJson = escapeHtml(JSON.stringify(data.original, null, 2));
            var cleanedJson = escapeHtml(JSON.stringify(data.cleaned, null, 2));

            var timestamp = new Date().toISOString();
            var newRevisionEntry = '* ' + timestamp + ': ' + deploymentReason;

            var destInfoHtml = '';
            if (!destData.exists) {
                destInfoHtml = '<div style="background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffc107; margin-top: 20px;"><strong>WARNING: Destination Status:</strong>  ' + escapeHtml(destData.message) + '  <em>A new workflow will be created.</em></div>';
            } else {
                var notesHtml = '';
                if (destData.special_notes && destData.special_notes.length > 0) {
                    var currentContent = destData.current_revision_content || '(no content)';
                    var updatedContent = currentContent ? currentContent + '\\n' + newRevisionEntry : newRevisionEntry;
                    
                    notesHtml = '<h4>Revision History:</h4><div style="background: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 4px solid #2196f3; border-radius: 3px;"><strong>Current Content:</strong>  <pre style="margin-top: 5px; white-space: pre-wrap; font-size: 12px;">' + escapeHtml(currentContent) + '</pre></div><div style="background: #e8f5e9; padding: 10px; margin: 10px 0; border-left: 4px solid #4caf50; border-radius: 3px;"><strong>Updated Content (after deployment):</strong>  <pre style="margin-top: 5px; white-space: pre-wrap; font-size: 12px;">' + escapeHtml(updatedContent) + '</pre></div>';
                } else {
                    notesHtml = '<p><em>No sticky note named "Revision History" found.</em></p>';
                }

                destInfoHtml = '<div style="background: #ffebee; padding: 15px; border-radius: 5px; border: 2px solid #f44336; margin-top: 20px;"><strong>WARNING: Workflow exists on destination!</strong>  <strong>Workflow Name:</strong> ' + escapeHtml(destData.workflow_name) + '  <strong>Workflow ID:</strong> ' + escapeHtml(destData.workflow_id) + '  <em>Clicking button will OVERWRITE the existing workflow using PUT.</em>' + notesHtml + '</div>';
            }

            var buttonBgColor = workflowExistsOnDestination ? '#f44336' : '#4caf50';
            var buttonText = workflowExistsOnDestination ? 'Confirm Overwrite' : 'Continue with Copying';

            workflowListContainer.innerHTML = '<h2>Workflow Details: ' + escapeHtml(workflowName) + '</h2><p><strong>Workflow ID:</strong> ' + escapeHtml(workflowId) + '</p><div style="background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffc107; margin: 15px 0;"><strong>Deployment Reason:</strong>  ' + escapeHtml(deploymentReason) + '</div><div style="display: flex; gap: 20px; margin-top: 20px;"><div style="width: 45%;"><h3 style="color: #666;">Original JSON (from API)</h3><pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow: auto; height: 250px; font-size: 11px;">' + originalJson + '</pre></div><div style="width: 45%;"><h3 style="color: #2e7d32;">Cleaned JSON (ready to deploy)</h3><pre style="background: #e8f5e9; padding: 15px; border-radius: 5px; overflow: auto; height: 250px; font-size: 11px; border: 2px solid #4caf50;">' + cleanedJson + '</pre></div></div>' + destInfoHtml + '<div style="margin-top: 20px; display: flex; gap: 10px;"><button id="back-btn">Back</button><button id="copy-btn" style="background: ' + buttonBgColor + '; color: white;">' + buttonText + '</button></div>';

            document.getElementById('back-btn').onclick = function() {
                location.reload();
            };

            document.getElementById('copy-btn').onclick = handleCopy;

            loader.style.display = 'none';
        })
        .catch(function(error) {
            errorMessage.textContent = 'Error: ' + error.message;
            loader.style.display = 'none';
        });
    }

    function handleCopy(e) {
        e.preventDefault();

        if (!currentCleanedWorkflow) {
            errorMessage.textContent = 'No workflow data available to copy.';
            return;
        }

        if (workflowExistsOnDestination) {
            var confirmed = confirm('Are you sure you want to OVERWRITE the existing workflow?\\n\\nThis will replace the entire workflow using PUT.\\n\\nClick OK to proceed or Cancel to go back.');
            
            if (!confirmed) {
                return;
            }
        }

        loader.style.display = 'block';
        errorMessage.textContent = '';

        fetch('/api/copy-workflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workflow: currentCleanedWorkflow,
                workflow_id: currentWorkflowId,
                is_update: workflowExistsOnDestination,
                reason: deploymentReason
            })
        })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(errorData) {
                    throw new Error(errorData.detail || 'Failed to copy workflow.');
                });
            }
            return response.json();
        })
        .then(function(result) {
            var actionText = result.action === 'updated' ? 'Updated (PUT)' : 'Created (POST)';
            var actionColor = result.action === 'updated' ? '#ff9800' : '#4caf50';
            
            workflowListContainer.innerHTML = '<div style="background: #e8f5e9; padding: 20px; border-radius: 5px; border: 2px solid ' + actionColor + '; margin-top: 20px;"><h2 style="color: #2e7d32;">SUCCESS: Workflow ' + actionText + ' Successfully!</h2><p><strong>Workflow Name:</strong> ' + escapeHtml(result.workflow.name) + '</p><p><strong>Workflow ID:</strong> ' + escapeHtml(result.workflow.id) + '</p><p><strong>Action:</strong> ' + escapeHtml(actionText) + '</p><p><strong>Deployment Reason:</strong> ' + escapeHtml(deploymentReason) + '</p><h3>Full Response:</h3><pre style="background: white; padding: 15px; border-radius: 5px; overflow: auto; max-height: 400px; font-size: 11px;">' + escapeHtml(JSON.stringify(result.workflow, null, 2)) + '</pre></div><button id="start-over-btn" style="margin-top: 20px;">Start Over</button>';

            document.getElementById('start-over-btn').onclick = function() {
                location.reload();
            };

            loader.style.display = 'none';
        })
        .catch(function(error) {
            errorMessage.textContent = 'Error: ' + error.message;
            loader.style.display = 'none';
        });
    }
});

