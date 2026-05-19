-- Seed data for Know-Flow (SQLite)
-- Sample Property Development Process Graph

-- Insert a sample process
INSERT OR IGNORE INTO processes (id, name, description, version) VALUES
('11111111-1111-1111-1111-111111111111', 'Property Development Process', 'Standard process flow for property development projects including annexation, zoning, and permits', 1);

-- Insert nodes for the process
-- Start node
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'start', 'Project Initiated', 'Start of the property development process', 250, 50, '{"fields": [{"name": "projectName", "type": "text", "label": "Project Name", "required": true}, {"name": "propertyAddress", "type": "text", "label": "Property Address", "required": true}]}');

-- Decision: City Limits
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'decision', 'Is property within City limits?', 'Determine if the property is within city jurisdiction', 250, 150, '{"fields": [{"name": "withinCityLimits", "type": "select", "label": "Within City Limits?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Annexation Required
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'task', 'Submit Annexation Application', 'Property requires annexation into city limits', 450, 250, '{"fields": [{"name": "annexationNumber", "type": "text", "label": "Annexation Application Number"}, {"name": "submissionDate", "type": "date", "label": "Submission Date"}]}');

-- Decision: Annexation Approved
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'decision', 'Annexation Approved?', 'Has the annexation been approved by the city?', 450, 350, '{"fields": [{"name": "annexationApproved", "type": "select", "label": "Annexation Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Zoning Review
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'task', 'Zoning Compliance Review', 'Review property zoning requirements and compliance', 250, 350, '{"fields": [{"name": "currentZoning", "type": "text", "label": "Current Zoning"}, {"name": "requiredZoning", "type": "text", "label": "Required Zoning"}, {"name": "compliant", "type": "select", "label": "Zoning Compliant?", "options": ["Yes", "No"]}]}');

-- Decision: Zoning Change Required
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'decision', 'Zoning Change Required?', 'Does the property require a zoning change?', 250, 450, '{"fields": [{"name": "zoningChangeRequired", "type": "select", "label": "Zoning Change Required?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Apply for Zoning Change
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', 'task', 'Apply for Zoning Change', 'Submit application for zoning change', 100, 550, '{"fields": [{"name": "zoningApplicationNumber", "type": "text", "label": "Zoning Application Number"}, {"name": "proposedZoning", "type": "text", "label": "Proposed Zoning"}]}');

-- Decision: Zoning Change Approved
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('22222222-3333-4444-5555-666666666666', '11111111-1111-1111-1111-111111111111', 'decision', 'Zoning Change Approved?', 'Has the zoning change been approved?', 100, 650, '{"fields": [{"name": "zoningApproved", "type": "select", "label": "Zoning Change Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Site Plan Submission
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('33333333-4444-5555-6666-777777777777', '11111111-1111-1111-1111-111111111111', 'task', 'Submit Site Plan', 'Prepare and submit detailed site plan', 250, 650, '{"fields": [{"name": "sitePlanNumber", "type": "text", "label": "Site Plan Number"}, {"name": "architect", "type": "text", "label": "Architect/Engineer"}, {"name": "submissionDate", "type": "date", "label": "Submission Date"}]}');

-- Decision: Site Plan Approved
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('44444444-5555-6666-7777-888888888888', '11111111-1111-1111-1111-111111111111', 'decision', 'Site Plan Approved?', 'Has the site plan been approved?', 250, 750, '{"fields": [{"name": "sitePlanApproved", "type": "select", "label": "Site Plan Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Apply for Building Permit
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('55555555-6666-7777-8888-999999999999', '11111111-1111-1111-1111-111111111111', 'task', 'Apply for Building Permit', 'Submit building permit application', 250, 850, '{"fields": [{"name": "permitNumber", "type": "text", "label": "Permit Number"}, {"name": "estimatedCost", "type": "number", "label": "Estimated Construction Cost"}, {"name": "squareFootage", "type": "number", "label": "Square Footage"}]}');

-- Decision: Permit Approved
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('66666666-7777-8888-9999-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'decision', 'Building Permit Approved?', 'Has the building permit been approved?', 250, 950, '{"fields": [{"name": "permitApproved", "type": "select", "label": "Permit Approved?", "options": ["Yes", "No"], "required": true}]}');

-- Task: Construction Phase
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('77777777-8888-9999-aaaa-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'task', 'Construction Phase', 'Begin construction with approved permits', 250, 1050, '{"fields": [{"name": "startDate", "type": "date", "label": "Construction Start Date"}, {"name": "contractor", "type": "text", "label": "General Contractor"}, {"name": "expectedCompletion", "type": "date", "label": "Expected Completion Date"}]}');

-- Task: Final Inspection
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('88888888-9999-aaaa-bbbb-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'task', 'Request Final Inspection', 'Request final building inspection', 250, 1150, '{"fields": [{"name": "inspectionDate", "type": "date", "label": "Inspection Date"}, {"name": "inspector", "type": "text", "label": "Inspector Name"}]}');

-- Decision: Inspection Passed
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('99999999-aaaa-bbbb-cccc-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'decision', 'Final Inspection Passed?', 'Did the final inspection pass?', 250, 1250, '{"fields": [{"name": "inspectionPassed", "type": "select", "label": "Inspection Passed?", "options": ["Yes", "No"], "required": true}]}');

-- End: Certificate of Occupancy
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'end', 'Certificate of Occupancy Issued', 'Project complete - CO issued', 250, 1350, '{"fields": [{"name": "coNumber", "type": "text", "label": "CO Number"}, {"name": "issueDate", "type": "date", "label": "Issue Date"}]}');

-- End: Project Terminated
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'end', 'Project Terminated', 'Project has been terminated or abandoned', 500, 750, '{"fields": [{"name": "terminationReason", "type": "text", "label": "Termination Reason"}, {"name": "terminationDate", "type": "date", "label": "Termination Date"}]}');

-- Insert edges
-- Start -> City Limits Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL);

-- City Limits -> Annexation (No)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'No', '{"field": "withinCityLimits", "value": "No"}');

-- City Limits -> Zoning Review (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Yes', '{"field": "withinCityLimits", "value": "Yes"}');

-- Annexation -> Annexation Approved Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL);

-- Annexation Approved -> Zoning Review (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Yes', '{"field": "annexationApproved", "value": "Yes"}');

-- Annexation Approved -> Terminated (No)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "annexationApproved", "value": "No"}');

-- Zoning Review -> Zoning Change Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ffffffff-ffff-ffff-ffff-ffffffffffff', NULL);

-- Zoning Change Required -> Apply for Change (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-2222-3333-4444-555555555555', 'Yes', '{"field": "zoningChangeRequired", "value": "Yes"}');

-- Zoning Change Required -> Site Plan (No)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-4444-5555-6666-777777777777', 'No', '{"field": "zoningChangeRequired", "value": "No"}');

-- Apply for Zoning Change -> Zoning Approved Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '11111111-2222-3333-4444-555555555555', '22222222-3333-4444-5555-666666666666', NULL);

-- Zoning Approved -> Site Plan (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ebbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '22222222-3333-4444-5555-666666666666', '33333333-4444-5555-6666-777777777777', 'Yes', '{"field": "zoningApproved", "value": "Yes"}');

-- Zoning Approved -> Terminated (No)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('eccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '22222222-3333-4444-5555-666666666666', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "zoningApproved", "value": "No"}');

-- Site Plan -> Site Plan Approved Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('eddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '33333333-4444-5555-6666-777777777777', '44444444-5555-6666-7777-888888888888', NULL);

-- Site Plan Approved -> Building Permit (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '44444444-5555-6666-7777-888888888888', '55555555-6666-7777-8888-999999999999', 'Yes', '{"field": "sitePlanApproved", "value": "Yes"}');

-- Site Plan Approved -> Terminated (No)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('efffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', '44444444-5555-6666-7777-888888888888', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "sitePlanApproved", "value": "No"}');

-- Building Permit -> Permit Approved Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e0111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '55555555-6666-7777-8888-999999999999', '66666666-7777-8888-9999-aaaaaaaaaaaa', NULL);

-- Permit Approved -> Construction (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e0222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '66666666-7777-8888-9999-aaaaaaaaaaaa', '77777777-8888-9999-aaaa-bbbbbbbbbbbb', 'Yes', '{"field": "permitApproved", "value": "Yes"}');

-- Permit Approved -> Terminated (No)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e0333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '66666666-7777-8888-9999-aaaaaaaaaaaa', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'No', '{"field": "permitApproved", "value": "No"}');

-- Construction -> Final Inspection
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e0444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '77777777-8888-9999-aaaa-bbbbbbbbbbbb', '88888888-9999-aaaa-bbbb-cccccccccccc', NULL);

-- Final Inspection -> Inspection Passed Decision
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('e0555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '88888888-9999-aaaa-bbbb-cccccccccccc', '99999999-aaaa-bbbb-cccc-dddddddddddd', NULL);

-- Inspection Passed -> CO Issued (Yes)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e0666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '99999999-aaaa-bbbb-cccc-dddddddddddd', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Yes', '{"field": "inspectionPassed", "value": "Yes"}');

-- Inspection Passed -> Construction (No - needs rework)
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('e0777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '99999999-aaaa-bbbb-cccc-dddddddddddd', '77777777-8888-9999-aaaa-bbbbbbbbbbbb', 'No', '{"field": "inspectionPassed", "value": "No"}');

-- Insert a sample project
INSERT OR IGNORE INTO projects (id, name, process_id, status) VALUES
('p1111111-1111-1111-1111-111111111111', 'Oak Street Development', '11111111-1111-1111-1111-111111111111', 'active');

-- Initialize project node statuses for the sample project (only if not exists)
INSERT OR IGNORE INTO project_node_statuses (id, project_id, node_id, status)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
  'p1111111-1111-1111-1111-111111111111',
  id,
  'not_started'
FROM nodes
WHERE process_id = '11111111-1111-1111-1111-111111111111'
AND NOT EXISTS (
  SELECT 1 FROM project_node_statuses
  WHERE project_id = 'p1111111-1111-1111-1111-111111111111' AND node_id = nodes.id
);

-- Mark start node as complete for the sample project
UPDATE project_node_statuses
SET status = 'complete', completed_at = datetime('now')
WHERE project_id = 'p1111111-1111-1111-1111-111111111111'
AND node_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Mark first decision as in progress
UPDATE project_node_statuses
SET status = 'in_progress', started_at = datetime('now')
WHERE project_id = 'p1111111-1111-1111-1111-111111111111'
AND node_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';


-- ============================================================
-- DEMO SEED ADDITION: Software Feature Development Process
-- Added for portfolio/demo purposes
-- ============================================================

INSERT OR IGNORE INTO processes (id, name, description, version) VALUES
('22222222-2222-4222-8222-222222222222', 'Software Feature Development', 'End-to-end workflow for planning, building, testing, and shipping software features from request to production', 1);

-- === NODES: Software Feature Development ===
INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000001-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'start', 'Feature Requested', 'A new feature request has been submitted for evaluation', 250, 50,
 '{"fields": [{"name": "featureTitle", "type": "text", "label": "Feature Title", "required": true}, {"name": "requestedBy", "type": "text", "label": "Requested By", "required": true}, {"name": "description", "type": "textarea", "label": "Description", "required": true}, {"name": "priority", "type": "select", "label": "Priority", "options": ["Low", "Medium", "High", "Critical"], "required": true}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'decision', 'In Scope?', 'Does this feature align with current roadmap and technical constraints?', 250, 175,
 '{"fields": [{"name": "inScope", "type": "select", "label": "In Scope?", "options": ["Yes", "No"], "required": true}, {"name": "notes", "type": "textarea", "label": "Scope Review Notes"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'task', 'Write Requirements', 'Document detailed functional and non-functional requirements with acceptance criteria', 250, 300,
 '{"fields": [{"name": "docLink", "type": "text", "label": "Requirements Doc URL"}, {"name": "acceptanceCriteria", "type": "textarea", "label": "Acceptance Criteria", "required": true}, {"name": "estimatedComplexity", "type": "select", "label": "Complexity Estimate", "options": ["Small", "Medium", "Large", "Epic"]}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'decision', 'Requirements Approved?', 'Has the product team signed off on the requirements document?', 250, 425,
 '{"fields": [{"name": "approved", "type": "select", "label": "Approved?", "options": ["Yes", "No"], "required": true}, {"name": "reviewer", "type": "text", "label": "Reviewer Name"}, {"name": "feedback", "type": "textarea", "label": "Feedback"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'task', 'Design & Architecture', 'Create technical design including system architecture, data models, and API contracts', 250, 550,
 '{"fields": [{"name": "designDocUrl", "type": "text", "label": "Design Doc URL"}, {"name": "techStack", "type": "text", "label": "Tech Stack / Affected Services"}, {"name": "dbChanges", "type": "select", "label": "Database Changes Required?", "options": ["Yes", "No"]}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'decision', 'Design Approved?', 'Has the technical design been reviewed and approved by engineering lead?', 250, 675,
 '{"fields": [{"name": "approved", "type": "select", "label": "Approved?", "options": ["Yes", "No"], "required": true}, {"name": "reviewer", "type": "text", "label": "Technical Reviewer"}, {"name": "comments", "type": "textarea", "label": "Review Comments"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'task', 'Development', 'Implement the feature according to approved design and requirements', 250, 800,
 '{"fields": [{"name": "branch", "type": "text", "label": "Git Branch", "required": true}, {"name": "prUrl", "type": "text", "label": "Pull Request URL"}, {"name": "startDate", "type": "date", "label": "Started"}, {"name": "devNotes", "type": "textarea", "label": "Implementation Notes"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'task', 'Code Review', 'Peer review of code changes for quality, security, and correctness', 250, 925,
 '{"fields": [{"name": "reviewer", "type": "text", "label": "Code Reviewer", "required": true}, {"name": "reviewDate", "type": "date", "label": "Review Date"}, {"name": "coveragePercent", "type": "number", "label": "Test Coverage %"}, {"name": "comments", "type": "textarea", "label": "Review Comments"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'decision', 'Code Review Passed?', 'Did the code review pass with no blocking issues?', 250, 1050,
 '{"fields": [{"name": "passed", "type": "select", "label": "Review Passed?", "options": ["Yes", "No"], "required": true}, {"name": "blockers", "type": "textarea", "label": "Blocking Issues (if any)"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa00000a-0000-4000-8000-000000000010', '22222222-2222-4222-8222-222222222222', 'task', 'QA Testing', 'Quality assurance testing including functional, regression, and edge case coverage', 250, 1175,
 '{"fields": [{"name": "tester", "type": "text", "label": "QA Engineer", "required": true}, {"name": "testPlanUrl", "type": "text", "label": "Test Plan URL"}, {"name": "bugsFound", "type": "number", "label": "Bugs Found"}, {"name": "bugsFixed", "type": "number", "label": "Bugs Fixed"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa00000b-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'decision', 'QA Passed?', 'Did QA testing pass with all critical issues resolved?', 250, 1300,
 '{"fields": [{"name": "passed", "type": "select", "label": "QA Passed?", "options": ["Yes", "No"], "required": true}, {"name": "openBugs", "type": "number", "label": "Open Bug Count"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa00000c-0000-4000-8000-000000000012', '22222222-2222-4222-8222-222222222222', 'task', 'Deploy to Staging', 'Deploy feature to staging environment for final stakeholder validation', 250, 1425,
 '{"fields": [{"name": "stagingUrl", "type": "text", "label": "Staging URL"}, {"name": "deployDate", "type": "date", "label": "Deploy Date"}, {"name": "deployedBy", "type": "text", "label": "Deployed By"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa00000d-0000-4000-8000-000000000013', '22222222-2222-4222-8222-222222222222', 'decision', 'Staging Sign-off?', 'Has the product owner approved the feature in staging?', 250, 1550,
 '{"fields": [{"name": "approved", "type": "select", "label": "Sign-off Given?", "options": ["Yes", "No"], "required": true}, {"name": "approver", "type": "text", "label": "Product Owner"}, {"name": "signoffDate", "type": "date", "label": "Sign-off Date"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa00000e-0000-4000-8000-000000000014', '22222222-2222-4222-8222-222222222222', 'task', 'Deploy to Production', 'Deploy approved feature to production with rollback plan ready', 250, 1675,
 '{"fields": [{"name": "deployDate", "type": "date", "label": "Production Deploy Date", "required": true}, {"name": "deployedBy", "type": "text", "label": "Deployed By", "required": true}, {"name": "releaseNotes", "type": "textarea", "label": "Release Notes"}, {"name": "rollbackPlan", "type": "text", "label": "Rollback Plan URL"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa00000f-0000-4000-8000-000000000015', '22222222-2222-4222-8222-222222222222', 'end', 'Feature Released', 'Feature is live in production and available to users', 250, 1800,
 '{"fields": [{"name": "releaseVersion", "type": "text", "label": "Release Version"}, {"name": "announcementUrl", "type": "text", "label": "Announcement URL"}]}');

INSERT OR IGNORE INTO nodes (id, process_id, type, title, description, position_x, position_y, form_schema) VALUES
('fa000010-0000-4000-8000-000000000016', '22222222-2222-4222-8222-222222222222', 'end', 'Feature Rejected', 'Feature will not be implemented — out of scope or deprioritized', 500, 175,
 '{"fields": [{"name": "reason", "type": "textarea", "label": "Rejection Reason", "required": true}, {"name": "rejectedBy", "type": "text", "label": "Rejected By"}, {"name": "rejectionDate", "type": "date", "label": "Date"}]}');

-- === EDGES: Software Feature Development ===
INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea000001-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'fa000001-0000-4000-8000-000000000001', 'fa000002-0000-4000-8000-000000000002', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'fa000002-0000-4000-8000-000000000002', 'fa000003-0000-4000-8000-000000000003', 'Yes', '{"field": "inScope", "value": "Yes"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'fa000002-0000-4000-8000-000000000002', 'fa000010-0000-4000-8000-000000000016', 'No', '{"field": "inScope", "value": "No"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'fa000003-0000-4000-8000-000000000003', 'fa000004-0000-4000-8000-000000000004', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'fa000004-0000-4000-8000-000000000004', 'fa000005-0000-4000-8000-000000000005', 'Yes', '{"field": "approved", "value": "Yes"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'fa000004-0000-4000-8000-000000000004', 'fa000010-0000-4000-8000-000000000016', 'No', '{"field": "approved", "value": "No"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'fa000005-0000-4000-8000-000000000005', 'fa000006-0000-4000-8000-000000000006', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'fa000006-0000-4000-8000-000000000006', 'fa000007-0000-4000-8000-000000000007', 'Yes', '{"field": "approved", "value": "Yes"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'fa000006-0000-4000-8000-000000000006', 'fa000005-0000-4000-8000-000000000005', 'No - Rework', '{"field": "approved", "value": "No"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea00000a-0000-4000-8000-000000000010', '22222222-2222-4222-8222-222222222222', 'fa000007-0000-4000-8000-000000000007', 'fa000008-0000-4000-8000-000000000008', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea00000b-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'fa000008-0000-4000-8000-000000000008', 'fa000009-0000-4000-8000-000000000009', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea00000c-0000-4000-8000-000000000012', '22222222-2222-4222-8222-222222222222', 'fa000009-0000-4000-8000-000000000009', 'fa00000a-0000-4000-8000-000000000010', 'Yes', '{"field": "passed", "value": "Yes"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea00000d-0000-4000-8000-000000000013', '22222222-2222-4222-8222-222222222222', 'fa000009-0000-4000-8000-000000000009', 'fa000007-0000-4000-8000-000000000007', 'No - Fix & Resubmit', '{"field": "passed", "value": "No"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea00000e-0000-4000-8000-000000000014', '22222222-2222-4222-8222-222222222222', 'fa00000a-0000-4000-8000-000000000010', 'fa00000b-0000-4000-8000-000000000011', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea00000f-0000-4000-8000-000000000015', '22222222-2222-4222-8222-222222222222', 'fa00000b-0000-4000-8000-000000000011', 'fa00000c-0000-4000-8000-000000000012', 'Yes', '{"field": "passed", "value": "Yes"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000010-0000-4000-8000-000000000016', '22222222-2222-4222-8222-222222222222', 'fa00000b-0000-4000-8000-000000000011', 'fa000007-0000-4000-8000-000000000007', 'No - Fix Bugs', '{"field": "passed", "value": "No"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea000011-0000-4000-8000-000000000017', '22222222-2222-4222-8222-222222222222', 'fa00000c-0000-4000-8000-000000000012', 'fa00000d-0000-4000-8000-000000000013', NULL);

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000012-0000-4000-8000-000000000018', '22222222-2222-4222-8222-222222222222', 'fa00000d-0000-4000-8000-000000000013', 'fa00000e-0000-4000-8000-000000000014', 'Yes', '{"field": "approved", "value": "Yes"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label, condition) VALUES
('ea000013-0000-4000-8000-000000000019', '22222222-2222-4222-8222-222222222222', 'fa00000d-0000-4000-8000-000000000013', 'fa00000a-0000-4000-8000-000000000010', 'No - Re-test', '{"field": "approved", "value": "No"}');

INSERT OR IGNORE INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
('ea000014-0000-4000-8000-000000000020', '22222222-2222-4222-8222-222222222222', 'fa00000e-0000-4000-8000-000000000014', 'fa00000f-0000-4000-8000-000000000015', NULL);

-- ============================================================
-- PROJECT 2: Main Street Office Complex (further along)
-- Property Development Process — at Construction Phase
-- ============================================================

INSERT OR IGNORE INTO projects (id, name, process_id, status) VALUES
('p2222222-2222-4222-8222-222222222222', 'Main Street Office Complex', '11111111-1111-1111-1111-111111111111', 'active');

INSERT OR IGNORE INTO project_node_statuses (id, project_id, node_id, status)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
  'p2222222-2222-4222-8222-222222222222',
  id,
  'not_started'
FROM nodes
WHERE process_id = '11111111-1111-1111-1111-111111111111'
AND NOT EXISTS (
  SELECT 1 FROM project_node_statuses
  WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = nodes.id
);

-- Project Initiated (start) — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-46 days'), completed_at = datetime('now', '-45 days'),
  form_data = '{"projectName": "Main Street Office Complex", "propertyAddress": "412 Main St, Suite 100"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Is property within City limits? — complete, chose Yes
UPDATE project_node_statuses SET status = 'complete', decision_result = 'Yes',
  started_at = datetime('now', '-44 days'), completed_at = datetime('now', '-44 days'),
  form_data = '{"withinCityLimits": "Yes"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Annexation path — skipped (property is within city limits)
UPDATE project_node_statuses SET status = 'skipped'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

UPDATE project_node_statuses SET status = 'skipped'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Zoning Compliance Review — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-42 days'), completed_at = datetime('now', '-40 days'),
  form_data = '{"currentZoning": "C-2 General Commercial", "requiredZoning": "C-2 General Commercial", "compliant": "Yes"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- Zoning Change Required? — complete, chose No
UPDATE project_node_statuses SET status = 'complete', decision_result = 'No',
  started_at = datetime('now', '-39 days'), completed_at = datetime('now', '-39 days'),
  form_data = '{"zoningChangeRequired": "No"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

-- Zoning change path — skipped
UPDATE project_node_statuses SET status = 'skipped'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '11111111-2222-3333-4444-555555555555';

UPDATE project_node_statuses SET status = 'skipped'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '22222222-3333-4444-5555-666666666666';

-- Submit Site Plan — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-36 days'), completed_at = datetime('now', '-30 days'),
  form_data = '{"sitePlanNumber": "SP-2025-0847", "architect": "Meridian Design Group", "submissionDate": "2025-11-12"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '33333333-4444-5555-6666-777777777777';

-- Site Plan Approved? — complete, chose Yes
UPDATE project_node_statuses SET status = 'complete', decision_result = 'Yes',
  started_at = datetime('now', '-25 days'), completed_at = datetime('now', '-25 days'),
  form_data = '{"sitePlanApproved": "Yes"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '44444444-5555-6666-7777-888888888888';

-- Apply for Building Permit — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-24 days'), completed_at = datetime('now', '-20 days'),
  form_data = '{"permitNumber": "BP-2025-2391", "estimatedCost": 4200000, "squareFootage": 18500}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '55555555-6666-7777-8888-999999999999';

-- Building Permit Approved? — complete, chose Yes
UPDATE project_node_statuses SET status = 'complete', decision_result = 'Yes',
  started_at = datetime('now', '-15 days'), completed_at = datetime('now', '-15 days'),
  form_data = '{"permitApproved": "Yes"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '66666666-7777-8888-9999-aaaaaaaaaaaa';

-- Construction Phase — in progress
UPDATE project_node_statuses SET status = 'in_progress',
  started_at = datetime('now', '-14 days'),
  form_data = '{"startDate": "2025-12-01", "contractor": "Apex Construction LLC", "expectedCompletion": "2026-08-15"}'
WHERE project_id = 'p2222222-2222-4222-8222-222222222222' AND node_id = '77777777-8888-9999-aaaa-bbbbbbbbbbbb';

-- ============================================================
-- PROJECT 3: User Authentication Feature (mid-way, in development)
-- Software Feature Development Process
-- ============================================================

INSERT OR IGNORE INTO projects (id, name, process_id, status) VALUES
('p3333333-3333-4333-8333-333333333333', 'User Authentication Feature', '22222222-2222-4222-8222-222222222222', 'active');

INSERT OR IGNORE INTO project_node_statuses (id, project_id, node_id, status)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
  'p3333333-3333-4333-8333-333333333333',
  id,
  'not_started'
FROM nodes
WHERE process_id = '22222222-2222-4222-8222-222222222222'
AND NOT EXISTS (
  SELECT 1 FROM project_node_statuses
  WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = nodes.id
);

-- Feature Requested — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-12 days'), completed_at = datetime('now', '-12 days'),
  form_data = '{"featureTitle": "User Authentication with JWT Refresh", "requestedBy": "Alex Chen", "description": "Implement secure user authentication with JWT access tokens, refresh token rotation, and remember-me functionality for the enterprise tier launch", "priority": "High"}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000001-0000-4000-8000-000000000001';

-- In Scope? — complete, Yes
UPDATE project_node_statuses SET status = 'complete', decision_result = 'Yes',
  started_at = datetime('now', '-11 days'), completed_at = datetime('now', '-11 days'),
  form_data = '{"inScope": "Yes", "notes": "Core auth aligns with Q1 security roadmap. Critical blocker for enterprise tier launch in March."}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000002-0000-4000-8000-000000000002';

-- Write Requirements — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-10 days'), completed_at = datetime('now', '-9 days'),
  form_data = '{"docLink": "https://example.com/projectiq-demo/auth-requirements-v2", "acceptanceCriteria": "1. Register with email/password
2. JWT access tokens expire in 15min
3. Refresh tokens rotate on use
4. Remember-me extends to 30 days
5. Account lockout after 5 failed attempts", "estimatedComplexity": "Large"}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000003-0000-4000-8000-000000000003';

-- Requirements Approved? — complete, Yes
UPDATE project_node_statuses SET status = 'complete', decision_result = 'Yes',
  started_at = datetime('now', '-8 days'), completed_at = datetime('now', '-8 days'),
  form_data = '{"approved": "Yes", "reviewer": "Sarah Kim", "feedback": "Requirements are clear and complete. Added note re: GDPR compliance for EU user accounts."}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000004-0000-4000-8000-000000000004';

-- Design & Architecture — complete
UPDATE project_node_statuses SET status = 'complete',
  started_at = datetime('now', '-7 days'), completed_at = datetime('now', '-5 days'),
  form_data = '{"designDocUrl": "https://example.com/projectiq-demo/auth-arch-v1", "techStack": "Node.js, Express, jsonwebtoken, bcrypt, Redis (token blacklist)", "dbChanges": "Yes"}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000005-0000-4000-8000-000000000005';

-- Design Approved? — complete, Yes
UPDATE project_node_statuses SET status = 'complete', decision_result = 'Yes',
  started_at = datetime('now', '-4 days'), completed_at = datetime('now', '-4 days'),
  form_data = '{"approved": "Yes", "reviewer": "Marcus Reyes", "comments": "Architecture looks solid. Redis for token blacklist is the right call. Minor suggestion: add rate limiting at the API gateway level."}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000006-0000-4000-8000-000000000006';

-- Development — in progress
UPDATE project_node_statuses SET status = 'in_progress',
  started_at = datetime('now', '-3 days'),
  form_data = '{"branch": "feature/jwt-auth-refresh", "prUrl": "", "startDate": "2026-03-11", "devNotes": "DB schema migration complete. Working on refresh token rotation logic and Redis integration."}'
WHERE project_id = 'p3333333-3333-4333-8333-333333333333' AND node_id = 'fa000007-0000-4000-8000-000000000007';
