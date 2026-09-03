-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(50) UNIQUE NOT NULL,
    mp_name VARCHAR(255),
    state VARCHAR(100),
    district VARCHAR(100),
    constituency VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    sanctioned_amount NUMERIC(15, 2),
    released_amount NUMERIC(15, 2),
    expenditure NUMERIC(15, 2),
    physical_progress NUMERIC(5, 2), -- Percentage
    start_date DATE,
    expected_completion DATE,
    actual_completion DATE,
    implementing_agency VARCHAR(255),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Scores Table
CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    overall_score INT,
    cost_score INT,
    delay_score INT,
    progress_score INT,
    duplicate_score INT,
    payment_score INT,
    risk_level VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Explanations Table
CREATE TABLE risk_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    signal VARCHAR(50), -- e.g., 'cost_anomaly', 'progress_mismatch'
    severity VARCHAR(20),
    explanation TEXT,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Similar Projects Table
CREATE TABLE similar_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    similar_project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    text_similarity NUMERIC(5, 4),
    geo_distance NUMERIC(10, 2), -- in km
    combined_similarity NUMERIC(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
