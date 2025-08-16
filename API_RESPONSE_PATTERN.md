# API Response Pattern Documentation

## Overview

All API endpoints now follow a standardized response pattern to ensure consistency and improve developer experience.

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // The actual response data
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "data": {
    // Additional error details (optional)
  }
}
```

### Warning Response

```json
{
  "status": "warning",
  "message": "Warning description",
  "data": {
    // Warning details
  }
}
```

### Paginated Response

```json
{
  "status": "success",
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## Status Values

- `success`: Operation completed successfully
- `error`: Operation failed with an error
- `warning`: Operation completed but with warnings

## Implementation Details

### Controllers

All controllers now return `Promise<ApiResponse<T>>` and use `ResponseUtils` to format responses.

### Error Handling

- Global exception filter ensures all errors follow the standard format
- Custom validation pipe formats validation errors consistently
- Response interceptor provides fallback formatting for any missed responses

### Success Messages

Centralized success messages in `SUCCESS_MESSAGES` constants for consistency.

## Example Usage

### In Controllers

```typescript
@Post('register')
async register(@Body() body: AuthDto): Promise<ApiResponse<any>> {
  const result = await this.auth.register(body.username);
  return ResponseUtils.success(result, SUCCESS_MESSAGES.AUTH.REGISTER_SUCCESS);
}
```

### Response Utilities

```typescript
// Simple success
ResponseUtils.success(data, "Custom message")

// Error response
ResponseUtils.error("Error message", additionalData)

// Warning response
ResponseUtils.warning(data, "Warning message")

// Paginated response
ResponseUtils.paginated(items, total, page, limit, "Custom message")
```

## Benefits

1. **Consistency**: All endpoints return the same response structure
2. **Developer Experience**: Frontend developers can rely on consistent response format
3. **Error Handling**: Standardized error responses make debugging easier
4. **Maintainability**: Centralized response formatting reduces code duplication
5. **Documentation**: Clear response structure improves API documentation
