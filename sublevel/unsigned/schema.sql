CREATE TABLE IF NOT EXISTS members(id bigserial PRIMARY KEY,handle varchar(24) UNIQUE NOT NULL,password_hash text NOT NULL,bio varchar(600) NOT NULL DEFAULT '',active boolean NOT NULL DEFAULT true,is_admin boolean NOT NULL DEFAULT false,created timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS tracks(id bigserial PRIMARY KEY,owner bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,title varchar(100) NOT NULL,genre varchar(40) NOT NULL,url varchar(500) NOT NULL,note varchar(1200) NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden')),created timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS feedback(id bigserial PRIMARY KEY,track bigint NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,author bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 19),body varchar(1500) NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden')),created timestamptz NOT NULL DEFAULT now(),UNIQUE(track,author));
CREATE TABLE IF NOT EXISTS reports(id bigserial PRIMARY KEY,track bigint NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,author bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,reason varchar(400) NOT NULL,resolved boolean NOT NULL DEFAULT false,created timestamptz NOT NULL DEFAULT now(),UNIQUE(track,author));
CREATE TABLE IF NOT EXISTS limits(key char(64) NOT NULL,hour timestamptz NOT NULL,n integer NOT NULL,PRIMARY KEY(key,hour));
CREATE INDEX IF NOT EXISTS tracks_status_created ON tracks(status,created DESC);
CREATE INDEX IF NOT EXISTS feedback_track_status ON feedback(track,status);
DELETE FROM limits WHERE hour<now()-interval '7 days';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS embed_url varchar(500) NOT NULL DEFAULT '';

ALTER TABLE members ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

ALTER TABLE members ADD COLUMN IF NOT EXISTS recovery_hash char(64);
