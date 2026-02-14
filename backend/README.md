# GreenSupply Backend

## Structure

- `app/`: FastAPI app entrypoint (`main.py`)
- `api/`: API route files
- `service/`: Business logic used by API routes
- `db/`: Database base models and async session setup
- `core/`: Settings and shared app config

## Quick start

1. Create and activate a virtual environment
   - PowerShell: `python -m venv .venv` then `.\.venv\Scripts\Activate.ps1`
2. Install dependencies
   - `pip install -r requirements.txt`
3. Copy env file and update values
   - `Copy-Item .env.example .env`
4. Run the API
   - `uvicorn app.main:app --reload`

Health endpoint:
- `GET /api/v1/health`
- `GET /api/v1/health/db`

Authenticated endpoint:
- `GET /api/v1/auth/me`
- Requires `Authorization: Bearer <supabase_access_token>`

Core MVP endpoints:
- `POST /api/v1/businesses`
- `GET /api/v1/businesses/{id}`
- `GET /api/v1/products`
- `GET /api/v1/regions`
- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `POST /api/v1/groups/{id}/join`
- `GET /api/v1/groups/{id}`
- `GET /api/v1/groups/{id}/impact`
- `POST /api/v1/recommend`
- `POST /api/v1/supplier-products`
- `GET /api/v1/supplier-products`
- `GET /api/v1/supplier-orders`

Region assignment:
- Businesses are auto-assigned to an SF region block on create.
- Preferred input: `latitude` + `longitude` in `POST /api/v1/businesses`.
- If coordinates are missing, backend attempts geocoding via Google Maps Geocoding API (`GOOGLE_MAPS_API_KEY`).

Group confirmation:
- Group moves to `confirmed` once `min_businesses_required` distinct businesses have joined.
- On confirmation:
  - supplier confirmed order record is created (if supplier is selected on the group)
  - supplier inventory is decremented automatically when `supplier_product_id` is set on the group
  - email notifications are attempted for participant businesses with email addresses
