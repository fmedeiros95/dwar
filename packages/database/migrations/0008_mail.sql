CREATE TABLE mail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), world_id uuid NOT NULL,
  sender_player_id uuid NOT NULL, recipient_player_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120), last_post_at timestamptz NOT NULL,
  sender_status text NOT NULL DEFAULT 'answered', recipient_status text NOT NULL DEFAULT 'new',
  sender_deleted boolean NOT NULL DEFAULT false, recipient_deleted boolean NOT NULL DEFAULT false,
  UNIQUE(id,world_id),
  FOREIGN KEY(sender_player_id,world_id) REFERENCES players(id,world_id),
  FOREIGN KEY(recipient_player_id,world_id) REFERENCES players(id,world_id),
  CONSTRAINT mail_thread_participants CHECK(sender_player_id<>recipient_player_id),
  CONSTRAINT mail_thread_status CHECK(sender_status IN ('answered','new','read') AND recipient_status IN ('answered','new','read'))
);
CREATE INDEX mail_threads_sender_idx ON mail_threads(world_id,sender_player_id,last_post_at);
CREATE INDEX mail_threads_recipient_idx ON mail_threads(world_id,recipient_player_id,last_post_at);
CREATE TABLE mail_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),world_id uuid NOT NULL,thread_id uuid NOT NULL,author_player_id uuid NOT NULL,
  text text NOT NULL CHECK(char_length(text) BETWEEN 3 AND 16000),created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(thread_id,world_id) REFERENCES mail_threads(id,world_id),
  FOREIGN KEY(author_player_id,world_id) REFERENCES players(id,world_id)
);
CREATE INDEX mail_posts_thread_idx ON mail_posts(thread_id,created_at,id);
CREATE TABLE mail_blocks (
  world_id uuid NOT NULL,blocker_player_id uuid NOT NULL,blocked_player_id uuid NOT NULL,
  PRIMARY KEY(blocker_player_id,blocked_player_id),CHECK(blocker_player_id<>blocked_player_id),
  FOREIGN KEY(blocker_player_id,world_id) REFERENCES players(id,world_id),
  FOREIGN KEY(blocked_player_id,world_id) REFERENCES players(id,world_id)
);
CREATE TABLE mail_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),world_id uuid NOT NULL,player_id uuid NOT NULL,request_id uuid NOT NULL,
  fingerprint text NOT NULL,result_thread_id uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(player_id,request_id),
  FOREIGN KEY(player_id,world_id) REFERENCES players(id,world_id),
  FOREIGN KEY(result_thread_id,world_id) REFERENCES mail_threads(id,world_id)
);
