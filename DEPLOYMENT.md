# Deployment Notes for Coolify

## Persistent Storage Configuration

### Automatic Volume Detection

The `Dockerfile` declares `/app/uploads` as a `VOLUME`, which means **Coolify should automatically detect and configure persistent storage** when you deploy.

### Verification in Coolify

After deployment, verify the volume was created:

1. Go to your application in Coolify
2. Navigate to **Storage** tab
3. You should see a volume mounted at `/app/uploads`

If for some reason it's not auto-detected, you can manually add it:
- **Destination:** `/app/uploads`
- **Type:** Volume

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
