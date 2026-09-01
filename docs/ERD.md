# Support Desk — Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ tickets : "raises (requester)"
    users ||--o{ tickets : "assigned to (assignee)"
    users ||--o{ comments : writes
    users ||--o{ ticket_events : "acts as (actor)"
    tickets ||--o{ comments : has
    tickets ||--o{ ticket_events : has
    tickets }o--o{ tags : "tagged via ticket_tags"
    tickets ||--o{ ticket_tags : links
    tags ||--o{ ticket_tags : links

    users {
        int id PK
        string email UK
        string password_hash
        string full_name
        user_role role
        timestamptz created_at
    }

    tickets {
        int id PK
        string subject
        text body
        ticket_status status
        ticket_priority priority
        int requester_id FK "NOT NULL, ON DELETE CASCADE"
        int assignee_id FK "NULL, ON DELETE SET NULL"
        timestamptz due_at
        timestamptz created_at
        timestamptz updated_at
    }

    comments {
        int id PK
        int ticket_id FK "NOT NULL, ON DELETE CASCADE"
        int author_id FK "NOT NULL, ON DELETE CASCADE"
        text body
        boolean is_internal "default false"
        timestamptz created_at
    }

    tags {
        int id PK
        string name UK
    }

    ticket_tags {
        int ticket_id FK "PK, ON DELETE CASCADE"
        int tag_id FK "PK, ON DELETE CASCADE"
    }

    ticket_events {
        int id PK
        int ticket_id FK "NOT NULL, ON DELETE CASCADE"
        int actor_id FK "NULL, ON DELETE SET NULL"
        ticket_status from_status
        ticket_status to_status
        text note
        timestamptz created_at
    }
```

**Enums**
- `user_role`: `customer` | `agent` | `admin`
- `ticket_status`: `open` | `in_progress` | `resolved` | `closed`
- `ticket_priority`: `low` | `normal` | `high` | `urgent`