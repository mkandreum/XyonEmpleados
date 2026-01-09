# Deployment Notes for Coolify

## Persistent Storage Configuration

### Required Volume Mount
The application requires a persistent volume for user uploads:

**Volume Path:** `/app/uploads`

### Coolify Configuration

In your Coolify deployment settings, add a **Persistent Storage** volume:

1. Go to your application in Coolify
2. Navigate to **Storage** tab
3. Add a new volume:
   - **Name:** `uploads` (or any descriptive name)
   - **Source:** Leave empty for auto-generated volume
   - **Destination:** `/app/uploads`
   - **Type:** Volume

This ensures uploaded files (logos, avatars, payrolls, justifications, news images) persist across container restarts and redeployments.

### Directory Structure
The uploads directory contains:
```
/app/uploads/
├── logos/          # Company logos
├── avatars/        # User profile pictures
├── payrolls/       # Payroll PDF documents
├── justifications/ # Vacation/absence justification documents
└── news/           # News article images
```

### Environment Variables
Ensure these are set in Coolify:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - (Optional) Defaults to 3000

### Database
The application uses PostgreSQL. Ensure your database service is configured and the `DATABASE_URL` points to it correctly.
