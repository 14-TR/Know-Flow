-- Seed data for Know-Flow
-- Sample Property Development Process Graph

-- Insert a sample process
INSERT INTO processes (id, name, description, version) VALUES
('11111111-1111-1111-1111-111111111111', 'Property Development Process', 'Standard process flow for property development projects including annexation, zoning, and permits', 1);

-- Insert nodes for the process
-- Start node
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'start', 'Project Initiated', 'Start of the property development process', 250, 50, '{"fields": [{"name": "projectName", "type": "text", "label": "Project Name", "required": true}, {"name": "propertyAddress", "type": "text", "label": "Property Address", "required": true}]}');

-- Decision: City Limits
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'decision', 'Is property within City limits?', 'Determine if the property is within city jurisdiction', 250, 150, '{"fields": [{"name": "withinCityLimits", "type": "select", "label": "Within City Limits?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Annexation Required
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'task', 'Submit Annexation Application', 'Property requires annexation into city limits', 450, 250, '{"fields": [{"name": "annexationNumber", "type": "text", "label": "Annexation Application Number"}, {"name": "submissionDate", "type": "date", "label": "Submission Date"}]}');

-- Decision: Annexation Approved
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'decision', 'Annexation Approved?', 'Has the annexation been approved by the city?', 450, 350, '{"fields": [{"name": "annexationApproved", "type": "select", "label": "Annexation Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Zoning Review
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'task', 'Zoning Compliance Review', 'Review property zoning requirements and compliance', 250, 350, '{"fields": [{"name": "currentZoning", "type": "text", "label": "Current Zoning"}, {"name": "requiredZoning", "type": "text", "label": "Required Zoning"}, {"name": "compliant", "type": "select", "label": "Zoning Compliant?", "options": ["Yes", "No"]}]}');

-- Decision: Zoning Change Required
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'decision', 'Zoning Change Required?', 'Does the property require a zoning change?', 250, 450, '{"fields": [{"name": "zoningChangeRequired", "type": "select", "label": "Zoning Change Required?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Apply for Zoning Change
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', 'task', 'Apply for Zoning Change', 'Submit application for zoning change', 100, 550, '{"fields": [{"name": "zoningApplicationNumber", "type": "text", "label": "Zoning Application Number"}, {"name": "proposedZoning", "type": "text", "label": "Proposed Zoning"}]}');

-- Decision: Zoning Change Approved
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('22222222-3333-4444-5555-666666666666', '11111111-1111-1111-1111-111111111111', 'decision', 'Zoning Change Approved?', 'Has the zoning change been approved?', 100, 650, '{"fields": [{"name": "zoningApproved", "type": "select", "label": "Zoning Change Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Site Plan Submission
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('33333333-4444-5555-6666-777777777777', '11111111-1111-1111-1111-111111111111', 'task', 'Submit Site Plan', 'Prepare and submit detailed site plan', 250, 650, '{"fields": [{"name": "sitePlanNumber", "type": "text", "label": "Site Plan Number"}, {"name": "architect", "type": "text", "label": "Architect/Engineer"}, {"name": "submissionDate", "type": "date", "label": "Submission Date"}]}');

-- Decision: Site Plan Approved
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('44444444-5555-6666-7777-888888888888', '11111111-1111-1111-1111-111111111111', 'decision', 'Site Plan Approved?', 'Has the site plan been approved?', 250, 750, '{"fields": [{"name": "sitePlanApproved", "type": "select", "label": "Site Plan Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Apply for Building Permit
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('55555555-6666-7777-8888-999999999999', '11111111-1111-1111-1111-111111111111', 'task', 'Apply for Building Permit', 'Submit building permit application', 250, 850, '{"fields": [{"name": "permitNumber", "type": "text", "label": "Permit Number"}, {"name": "estimatedCost", "type": "number", "label": "Estimated Construction Cost"}, {"name": "squareFootage", "type": "number", "label": "Square Footage"}]}');

-- Decision: Permit Approved
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('66666666-7777-8888-9999-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'decision', 'Building Permit Approved?', 'Has the building permit been approved?', 250, 950, '{"fields": [{"name": "permitApproved", "type": "select", "label": "Permit Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Construction Phase
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('77777777-8888-9999-aaaa-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'task', 'Construction Phase', 'Begin construction with approved permits', 250, 1050, '{"fields": [{"name": "startDate", "type": "date", "label": "Construction Start Date"}, {"name": "contractor", "type": "text", "label": "General Contractor"}, {"name": "expectedCompletion", "type": "date", "label": "Expected Completion Date"}]}');

-- Task: Final Inspection
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('88888888-9999-aaaa-bbbb-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'task', 'Request Final Inspection', 'Request final building inspection', 250, 1150, '{"fields": [{"name": "inspectionDate", "type": "date", "label": "Inspection Date"}, {"name": "inspector", "type": "text", "label": "Inspector Name"}]}');

-- Decision: Inspection Passed
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('99999999-aaaa-bbbb-cccc-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'decision', 'Final Inspection Passed?', 'Did the final inspection pass?', 250, 1250, '{"fields": [{"name": "inspectionPassed", "type": "select", "label": "Inspection Passed?", "options": ["Yes", "No"], "required": true}]}');

-- End: Certificate of Occupancy
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'end', 'Certificate of Occupancy Issued', 'Project complete - CO issued', 250, 1350, '{"fields": [{"name": "coNumber", "type": "text", "label": "CO Number"}, {"name": "issueDate", "type": "date", "label": "Issue Date"}]}');

-- End: Project Terminated
INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'end', 'Project Terminated', 'Project has been terminated or abandoned', 500, 750, '{"fields": [{"name": "terminationReason", "type": "text", "label": "Termination Reason"}, {"name": "terminationDate", "type": "date", "label": "Termination Date"}]}');

-- Insert edges
-- Start -> City Limits Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL);

-- City Limits -> Annexation (No)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'No', '{"field": "withinCityLimits", "value": "No"}');

-- City Limits -> Zoning Review (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Yes', '{"field": "withinCityLimits", "value": "Yes"}');

-- Annexation -> Annexation Approved Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL);

-- Annexation Approved -> Zoning Review (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Yes', '{"field": "annexationApproved", "value": "Yes"}');

-- Annexation Approved -> Terminated (No)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "annexationApproved", "value": "No"}');

-- Zoning Review -> Zoning Change Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ffffffff-ffff-ffff-ffff-ffffffffffff', NULL);

-- Zoning Change Required -> Apply for Change (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-2222-3333-4444-555555555555', 'Yes', '{"field": "zoningChangeRequired", "value": "Yes"}');

-- Zoning Change Required -> Site Plan (No)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-4444-5555-6666-777777777777', 'No', '{"field": "zoningChangeRequired", "value": "No"}');

-- Apply for Zoning Change -> Zoning Approved Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '11111111-2222-3333-4444-555555555555', '22222222-3333-4444-5555-666666666666', NULL);

-- Zoning Approved -> Site Plan (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ebbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '22222222-3333-4444-5555-666666666666', '33333333-4444-5555-6666-777777777777', 'Yes', '{"field": "zoningApproved", "value": "Yes"}');

-- Zoning Approved -> Terminated (No)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ecccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '22222222-3333-4444-5555-666666666666', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "zoningApproved", "value": "No"}');

-- Site Plan -> Site Plan Approved Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('edddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '33333333-4444-5555-6666-777777777777', '44444444-5555-6666-7777-888888888888', NULL);

-- Site Plan Approved -> Building Permit (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('eeeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '44444444-5555-6666-7777-888888888888', '55555555-6666-7777-8888-999999999999', 'Yes', '{"field": "sitePlanApproved", "value": "Yes"}');

-- Site Plan Approved -> Terminated (No)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('effffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', '44444444-5555-6666-7777-888888888888', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "sitePlanApproved", "value": "No"}');

-- Building Permit -> Permit Approved Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '55555555-6666-7777-8888-999999999999', '66666666-7777-8888-9999-aaaaaaaaaaaa', NULL);

-- Permit Approved -> Construction (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '66666666-7777-8888-9999-aaaaaaaaaaaa', '77777777-8888-9999-aaaa-bbbbbbbbbbbb', 'Yes', '{"field": "permitApproved", "value": "Yes"}');

-- Permit Approved -> Terminated (No)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '66666666-7777-8888-9999-aaaaaaaaaaaa', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "permitApproved", "value": "No"}');

-- Construction -> Final Inspection
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '77777777-8888-9999-aaaa-bbbbbbbbbbbb', '88888888-9999-aaaa-bbbb-cccccccccccc', NULL);

-- Final Inspection -> Inspection Passed Decision
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '88888888-9999-aaaa-bbbb-cccccccccccc', '99999999-aaaa-bbbb-cccc-dddddddddddd', NULL);

-- Inspection Passed -> CO Issued (Yes)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '99999999-aaaa-bbbb-cccc-dddddddddddd', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Yes', '{"field": "inspectionPassed", "value": "Yes"}');

-- Inspection Passed -> Construction (No - needs rework)
INSERT INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '99999999-aaaa-bbbb-cccc-dddddddddddd', '77777777-8888-9999-aaaa-bbbbbbbbbbbb', 'No', '{"field": "inspectionPassed", "value": "No"}');

-- Insert a sample project
INSERT INTO projects (id, name, process_id, status) VALUES
('p1111111-1111-1111-1111-111111111111', 'Oak Street Development', '11111111-1111-1111-1111-111111111111', 'active');

-- Initialize project node statuses for the sample project
INSERT INTO project_node_statuses (project_id, node_id, status)
SELECT 'p1111111-1111-1111-1111-111111111111', id, 'not_started'
FROM nodes WHERE process_id = '11111111-1111-1111-1111-111111111111';

-- Mark start node as complete for the sample project
UPDATE project_node_statuses
SET status = 'complete', completed_at = NOW()
WHERE project_id = 'p1111111-1111-1111-1111-111111111111'
AND node_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Mark first decision as in progress
UPDATE project_node_statuses
SET status = 'in_progress', started_at = NOW(), completed_at = NULL
WHERE project_id = 'p1111111-1111-1111-1111-111111111111'
AND node_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
