-- City Development Flow Chart Process
-- Based on 5/17/2016 Development Flow Chart
-- Best Case Timeline: 6.25 months to Start Construction

-- Insert the process
INSERT INTO processes (id, name, description, version) VALUES (
    'city-dev-001',
    'City Development Flow Chart',
    'Complete city development process from parcel selection to construction start. Best case timeline: 6.25 months. Includes annexation, zoning, platting, engineering reviews, DEQ approval, and permit acquisition.',
    1
);

-- ============================================================================
-- NODES
-- ============================================================================
-- Organized by timeline phase (6.25 mo → 0 mo)
-- X positions: 0-200 (left track), 250-450 (center track), 500-700 (right track)
-- Y positions: 0 (top/start) → 2400 (bottom/end)

-- PHASE 1: Initial Property Evaluation (6.25 mo mark)
-- ============================================================================

INSERT INTO nodes (id, process_id, type, title, description, position_x, position_y, metadata) VALUES
-- Start node
('node-start', 'city-dev-001', 'start', 'Company Chooses Parcel', 'Initial parcel selection by the development company', 300, 0, '{"timeline": "6.25 mo", "phase": 1}'),

-- City limits check
('node-city-limits', 'city-dev-001', 'decision', 'Is property within City limits?', 'Determine if property is inside city boundaries', 300, 80, '{"timeline": "6.25 mo"}'),
('node-city-process', 'city-dev-001', 'task', 'City Process', 'Property is within city limits - proceed with standard city process', 500, 80, '{"timeline": "6.25 mo"}'),

-- Adjacent to city check (if not within limits)
('node-adjacent-check', 'city-dev-001', 'decision', 'Is property adjacent to City limits?', 'Check if property borders city boundaries for potential annexation', 100, 160, '{"timeline": "6.25 mo"}'),

-- Annexation track
('node-annexation', 'city-dev-001', 'task', 'Annexation Submittal', 'Submit annexation application to city', 100, 240, '{"timeline": "6.0 mo", "duration": "2.5 months"}'),
('node-annexation-decision', 'city-dev-001', 'decision', 'Was annexation approved?', 'City council decision on annexation request', 100, 340, '{"timeline": "3.75 mo"}'),
('node-no-project-annex', 'city-dev-001', 'end', 'No Project (Annexation Denied)', 'Project cannot proceed - annexation was denied', 0, 420, '{"reason": "annexation_denied"}'),

-- Zoning check
('node-zoning-check', 'city-dev-001', 'decision', 'Is property zoned correctly?', 'Verify property has appropriate zoning for development', 300, 160, '{"timeline": "6.25 mo"}'),
('node-zoning-process', 'city-dev-001', 'task', 'Zoning Process', 'Submit zoning change application', 300, 240, '{"timeline": "6.0 mo", "duration": "2.5 months"}'),
('node-zoning-decision', 'city-dev-001', 'decision', 'Was zoning approved?', 'Planning commission and council decision on zoning', 300, 340, '{"timeline": "3.75 mo"}'),
('node-no-project-zoning', 'city-dev-001', 'end', 'No Project (Zoning Denied)', 'Project cannot proceed - zoning was denied', 200, 420, '{"reason": "zoning_denied"}'),

-- Platting check
('node-platting-check', 'city-dev-001', 'decision', 'Is property platted correctly?', 'Verify property has proper platting/subdivision', 500, 160, '{"timeline": "6.25 mo"}'),
('node-platting-process', 'city-dev-001', 'task', 'Platting Process', 'Submit plat application', 500, 240, '{"timeline": "6.0 mo", "duration": "2 months"}'),
('node-platting-decision', 'city-dev-001', 'decision', 'Was platting approved?', 'Planning commission decision on plat', 500, 340, '{"timeline": "4.0 mo"}'),
('node-no-project-platting', 'city-dev-001', 'end', 'No Project (Platting Denied)', 'Project cannot proceed - platting was denied', 600, 420, '{"reason": "platting_denied"}'),

-- Pay fees and record
('node-pay-fees', 'city-dev-001', 'task', 'Pay community facility fees and record plat', 'Pay required fees and record the plat with county', 400, 480, '{"timeline": "3.75 mo"}'),

-- PHASE 2: Concurrent Submittal Tracks (3.75 mo mark)
-- ============================================================================

-- Civil Construction Track (Left)
('node-civil-submittal', 'city-dev-001', 'task', 'Civil Construction Drawing Submittal', 'Submit civil engineering drawings to city', 100, 560, '{"timeline": "3.75 mo", "duration": "1 month", "track": "civil"}'),
('node-civil-review', 'city-dev-001', 'task', 'City Engineering Review', 'City engineering department reviews civil drawings', 100, 640, '{"timeline": "3.5 mo", "duration": "21 calendar days", "track": "civil"}'),
('node-civil-decision', 'city-dev-001', 'decision', 'Construction Drawings approved?', 'Engineering department approval decision', 100, 720, '{"timeline": "2.75 mo", "track": "civil"}'),
('node-civil-revise', 'city-dev-001', 'task', 'Revise Drawings', 'Revise civil drawings per review comments', 0, 800, '{"duration": "1-2 weeks", "track": "civil"}'),
('node-civil-signed', 'city-dev-001', 'task', 'Get Approved Construction Drawings Signed', 'Obtain signatures on approved civil drawings', 100, 880, '{"track": "civil"}'),

-- DEQ Track (branches from civil)
('node-deq-check', 'city-dev-001', 'decision', 'Does project warrant DEQ Submittal?', 'Determine if DEQ review is required', 0, 720, '{"track": "deq"}'),
('node-deq-submittal', 'city-dev-001', 'task', 'DEQ Submittal', 'Submit to Department of Environmental Quality', 0, 880, '{"track": "deq"}'),
('node-deq-review', 'city-dev-001', 'task', 'DEQ Review', 'DEQ reviews environmental compliance', 0, 960, '{"duration": "4 weeks", "track": "deq"}'),
('node-deq-decision', 'city-dev-001', 'decision', 'DEQ Approval?', 'DEQ approval decision', 0, 1040, '{"track": "deq"}'),
('node-deq-revise', 'city-dev-001', 'task', 'Revise Submittal', 'Revise DEQ submittal per comments', -100, 1120, '{"track": "deq"}'),
('node-record-easements', 'city-dev-001', 'task', 'Record Required Easements', 'Record any required easements with county', 0, 1200, '{"track": "deq"}'),
('node-deq-swppp', 'city-dev-001', 'task', 'Apply for DEQ SW/PPP', 'Apply for stormwater pollution prevention permit', 100, 1200, '{"duration": "6 weeks", "track": "deq"}'),
('node-deq-approval', 'city-dev-001', 'task', 'DEQ SW/PPP Approval', 'Receive DEQ stormwater permit approval', 50, 1280, '{"track": "deq"}'),

-- Site Plan Track (Center)
('node-site-submittal', 'city-dev-001', 'task', 'City Site Plan Submittal', 'Submit site plan to city planning', 300, 560, '{"timeline": "3.75 mo", "duration": "1 month", "track": "site"}'),
('node-site-review', 'city-dev-001', 'task', 'City Site Plan Review', 'City planning reviews site plan', 300, 640, '{"timeline": "3.5 mo", "duration": "21 calendar days", "track": "site"}'),
('node-site-decision', 'city-dev-001', 'decision', 'Site Plan Approved?', 'Planning department approval decision', 300, 720, '{"timeline": "2.75 mo", "track": "site"}'),
('node-site-revise', 'city-dev-001', 'task', 'Revise Drawings', 'Revise site plan per review comments', 200, 800, '{"duration": "1-2 weeks", "track": "site"}'),

-- Building Plan Track (Right)
('node-building-submittal', 'city-dev-001', 'task', 'Submit Building for Plan Review', 'Submit building plans to building department', 500, 560, '{"timeline": "3.75 mo", "duration": "1 month", "track": "building"}'),
('node-building-review', 'city-dev-001', 'task', 'Building Plan Review', 'Building department reviews plans', 500, 640, '{"timeline": "3.5 mo", "duration": "21 business days", "track": "building"}'),
('node-building-decision', 'city-dev-001', 'decision', 'Building Plan approved?', 'Building department approval decision', 500, 720, '{"timeline": "2.75 mo", "track": "building"}'),
('node-building-revise', 'city-dev-001', 'task', 'Revise Drawings', 'Revise building plans per review comments', 600, 800, '{"duration": "2-4 weeks", "track": "building"}'),

-- Convergence point for civil and site plan
('node-cds-complete', 'city-dev-001', 'decision', 'CDs complete and approved?', 'Verify both civil and site plan drawings are complete', 200, 960, '{"timeline": "2.5 mo"}'),

-- Bid and Contractor Selection
('node-bid-project', 'city-dev-001', 'task', 'Bid Project', 'Issue project for contractor bidding', 200, 1040, '{"track": "main"}'),
('node-select-contractor', 'city-dev-001', 'task', 'Select Contractor', 'Evaluate bids and select contractor', 200, 1120, '{"track": "main"}'),

-- Building plan review completion check
('node-building-complete', 'city-dev-001', 'decision', 'Building Plan review complete?', 'Verify building plan review is complete', 500, 1040, '{"track": "building"}'),

-- Property size check for DEQ SW/PPP
('node-property-size', 'city-dev-001', 'decision', 'Is property greater than 5 Acres?', 'Check if property requires DEQ stormwater permit', 100, 1360, '{"track": "permits"}'),

-- PHASE 3: Permit Applications (1.25 mo mark)
-- ============================================================================

-- System Development Fees
('node-pay-system-fees', 'city-dev-001', 'task', 'Pay System Development Fees', 'Pay required system development fees', 0, 1440, '{"timeline": "1.25 mo"}'),

-- Grading Permit
('node-grading-apply', 'city-dev-001', 'task', 'Apply for Grading Permit', 'Submit grading permit application', 150, 1440, '{"timeline": "1.0 mo", "duration": "1 week"}'),
('node-grading-approval', 'city-dev-001', 'task', 'Grading Permit Approval', 'Receive grading permit', 150, 1520, '{"timeline": "0.75 mo"}'),

-- Right of Way Permit
('node-row-apply', 'city-dev-001', 'task', 'Apply for Right of Way Permit', 'Submit ROW permit application', 300, 1440, '{"timeline": "1.0 mo", "duration": "1 week"}'),
('node-row-approval', 'city-dev-001', 'task', 'Right of Way Permit Approval', 'Receive ROW permit', 300, 1520, '{"timeline": "0.75 mo"}'),

-- Building Permit
('node-building-permit-apply', 'city-dev-001', 'task', 'Apply for Building Permit', 'Submit building permit application', 450, 1440, '{"timeline": "1.0 mo", "duration": "1 week"}'),
('node-building-permit-approval', 'city-dev-001', 'task', 'Building Permit Approval', 'Receive building permit', 450, 1520, '{"timeline": "0.75 mo"}'),

-- PHASE 4: Pre-Construction and Start (0.25 mo → 0 mo)
-- ============================================================================

('node-precon', 'city-dev-001', 'task', 'Pre-con Meeting', 'Pre-construction meeting with city and contractor', 300, 1680, '{"timeline": "0.25 mo"}'),

-- End node
('node-start-construction', 'city-dev-001', 'end', 'Start Construction', 'All approvals complete - construction begins', 300, 1760, '{"timeline": "0 mo"}');

-- ============================================================================
-- EDGES
-- ============================================================================

INSERT INTO edges (id, process_id, source_node_id, target_node_id, label) VALUES
-- Start to city limits check
('edge-001', 'city-dev-001', 'node-start', 'node-city-limits', NULL),

-- City limits decision
('edge-002', 'city-dev-001', 'node-city-limits', 'node-city-process', 'Yes'),
('edge-003', 'city-dev-001', 'node-city-limits', 'node-adjacent-check', 'No'),

-- City process to zoning check
('edge-004', 'city-dev-001', 'node-city-process', 'node-zoning-check', NULL),

-- Adjacent check
('edge-005', 'city-dev-001', 'node-adjacent-check', 'node-annexation', 'Yes'),
('edge-006', 'city-dev-001', 'node-adjacent-check', 'node-no-project-annex', 'No'),

-- Annexation flow
('edge-007', 'city-dev-001', 'node-annexation', 'node-annexation-decision', NULL),
('edge-008', 'city-dev-001', 'node-annexation-decision', 'node-zoning-check', 'Yes'),
('edge-009', 'city-dev-001', 'node-annexation-decision', 'node-no-project-annex', 'No'),
('edge-010', 'city-dev-001', 'node-annexation-decision', 'node-annexation', 'Revise and re-submit'),

-- Zoning check and flow
('edge-011', 'city-dev-001', 'node-zoning-check', 'node-platting-check', 'Yes'),
('edge-012', 'city-dev-001', 'node-zoning-check', 'node-zoning-process', 'No'),
('edge-013', 'city-dev-001', 'node-zoning-process', 'node-zoning-decision', NULL),
('edge-014', 'city-dev-001', 'node-zoning-decision', 'node-platting-check', 'Yes'),
('edge-015', 'city-dev-001', 'node-zoning-decision', 'node-no-project-zoning', 'No'),
('edge-016', 'city-dev-001', 'node-zoning-decision', 'node-zoning-process', 'Revise and re-submit'),

-- Platting check and flow
('edge-017', 'city-dev-001', 'node-platting-check', 'node-pay-fees', 'Yes'),
('edge-018', 'city-dev-001', 'node-platting-check', 'node-platting-process', 'No'),
('edge-019', 'city-dev-001', 'node-platting-process', 'node-platting-decision', NULL),
('edge-020', 'city-dev-001', 'node-platting-decision', 'node-pay-fees', 'Yes'),
('edge-021', 'city-dev-001', 'node-platting-decision', 'node-no-project-platting', 'No'),
('edge-022', 'city-dev-001', 'node-platting-decision', 'node-platting-process', 'Revise and re-submit'),

-- Pay fees to concurrent tracks (can be concurrent)
('edge-023', 'city-dev-001', 'node-pay-fees', 'node-civil-submittal', NULL),
('edge-024', 'city-dev-001', 'node-pay-fees', 'node-site-submittal', NULL),
('edge-025', 'city-dev-001', 'node-pay-fees', 'node-building-submittal', NULL),

-- Civil construction track
('edge-026', 'city-dev-001', 'node-civil-submittal', 'node-civil-review', NULL),
('edge-027', 'city-dev-001', 'node-civil-review', 'node-civil-decision', NULL),
('edge-028', 'city-dev-001', 'node-civil-decision', 'node-civil-signed', 'Yes'),
('edge-029', 'city-dev-001', 'node-civil-decision', 'node-civil-revise', 'No'),
('edge-030', 'city-dev-001', 'node-civil-revise', 'node-civil-review', 'Re-submit'),
('edge-031', 'city-dev-001', 'node-civil-signed', 'node-cds-complete', NULL),

-- DEQ track (branches from civil submittal if needed)
('edge-032', 'city-dev-001', 'node-civil-submittal', 'node-deq-check', NULL),
('edge-033', 'city-dev-001', 'node-deq-check', 'node-deq-submittal', 'Yes'),
('edge-034', 'city-dev-001', 'node-deq-submittal', 'node-deq-review', NULL),
('edge-035', 'city-dev-001', 'node-deq-review', 'node-deq-decision', NULL),
('edge-036', 'city-dev-001', 'node-deq-decision', 'node-record-easements', 'Yes'),
('edge-037', 'city-dev-001', 'node-deq-decision', 'node-deq-revise', 'No'),
('edge-038', 'city-dev-001', 'node-deq-revise', 'node-deq-review', 'Re-submit'),
('edge-039', 'city-dev-001', 'node-record-easements', 'node-deq-swppp', NULL),
('edge-040', 'city-dev-001', 'node-deq-swppp', 'node-deq-approval', NULL),

-- Site plan track
('edge-041', 'city-dev-001', 'node-site-submittal', 'node-site-review', NULL),
('edge-042', 'city-dev-001', 'node-site-review', 'node-site-decision', NULL),
('edge-043', 'city-dev-001', 'node-site-decision', 'node-cds-complete', 'Yes'),
('edge-044', 'city-dev-001', 'node-site-decision', 'node-site-revise', 'No'),
('edge-045', 'city-dev-001', 'node-site-revise', 'node-site-review', 'Re-submit'),

-- Building plan track
('edge-046', 'city-dev-001', 'node-building-submittal', 'node-building-review', NULL),
('edge-047', 'city-dev-001', 'node-building-review', 'node-building-decision', NULL),
('edge-048', 'city-dev-001', 'node-building-decision', 'node-building-complete', 'Yes'),
('edge-049', 'city-dev-001', 'node-building-decision', 'node-building-revise', 'No'),
('edge-050', 'city-dev-001', 'node-building-revise', 'node-building-review', 'Re-submit'),

-- CDs complete to bid
('edge-051', 'city-dev-001', 'node-cds-complete', 'node-bid-project', 'Yes'),
('edge-052', 'city-dev-001', 'node-bid-project', 'node-select-contractor', NULL),

-- Building complete to permit application
('edge-053', 'city-dev-001', 'node-building-complete', 'node-building-permit-apply', 'Yes'),

-- Property size check for DEQ
('edge-054', 'city-dev-001', 'node-deq-approval', 'node-property-size', NULL),
('edge-055', 'city-dev-001', 'node-property-size', 'node-grading-apply', 'Yes'),
('edge-056', 'city-dev-001', 'node-property-size', 'node-grading-apply', 'No'),

-- Permit applications (can be concurrent after select contractor)
('edge-057', 'city-dev-001', 'node-select-contractor', 'node-pay-system-fees', NULL),
('edge-058', 'city-dev-001', 'node-pay-system-fees', 'node-grading-apply', NULL),
('edge-059', 'city-dev-001', 'node-select-contractor', 'node-row-apply', NULL),

-- Permit approvals
('edge-060', 'city-dev-001', 'node-grading-apply', 'node-grading-approval', NULL),
('edge-061', 'city-dev-001', 'node-row-apply', 'node-row-approval', NULL),
('edge-062', 'city-dev-001', 'node-building-permit-apply', 'node-building-permit-approval', NULL),

-- All permits to pre-con meeting
('edge-063', 'city-dev-001', 'node-grading-approval', 'node-precon', NULL),
('edge-064', 'city-dev-001', 'node-row-approval', 'node-precon', NULL),
('edge-065', 'city-dev-001', 'node-building-permit-approval', 'node-precon', NULL),

-- Pre-con to construction start
('edge-066', 'city-dev-001', 'node-precon', 'node-start-construction', NULL);
