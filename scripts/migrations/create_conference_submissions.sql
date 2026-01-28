-- Conference Submissions Table
CREATE TABLE IF NOT EXISTS conference_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Conference Details
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    online BOOLEAN DEFAULT FALSE,
    domain VARCHAR(50) NOT NULL,
    
    -- CFP Information
    cfp_url VARCHAR(2048),
    cfp_end_date DATE,
    
    -- Financial Aid
    has_financial_aid BOOLEAN DEFAULT FALSE,
    financial_aid_types TEXT[],
    
    -- Additional Information
    description TEXT,
    tags TEXT[],
    
    -- Organizer Information
    organizer_name VARCHAR(255) NOT NULL,
    organizer_email VARCHAR(255) NOT NULL,
    submission_type VARCHAR(20) DEFAULT 'new',
    additional_notes TEXT,
    
    -- Submission Status
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT valid_submission_type CHECK (submission_type IN ('new', 'update')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conference_submissions_status ON conference_submissions(status);
CREATE INDEX IF NOT EXISTS idx_conference_submissions_domain ON conference_submissions(domain);
CREATE INDEX IF NOT EXISTS idx_conference_submissions_created_at ON conference_submissions(created_at DESC);

-- Unique constraint to prevent duplicate pending submissions for the same URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_conference_submissions_unique_pending_url 
ON conference_submissions(url) 
WHERE status = 'pending';

-- Add comments
COMMENT ON TABLE conference_submissions IS 'User-submitted conferences for review and approval';
COMMENT ON COLUMN conference_submissions.status IS 'pending: awaiting review, approved: added to database, rejected: declined, duplicate: already exists';
COMMENT ON COLUMN conference_submissions.submission_type IS 'new: new conference, update: update existing conference';