# Frontend

This frontend is configured to use the deployed backend at:

`https://assest-backend-z6uq.onrender.com`

## Environment Variable

Set the backend URL in your environment:

```bash
REACT_APP_BACKEND_URL=https://assest-backend-z6uq.onrender.com
```

## Run Locally

```bash
npm install
npm start
```

The app runs locally at `http://localhost:3000`.

## Production

If this frontend is deployed on Vercel, make sure the Vercel project environment variable is also set to:

`REACT_APP_BACKEND_URL=https://assest-backend-z6uq.onrender.com`
