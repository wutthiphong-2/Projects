from fastapi import APIRouter, Depends, Request
from typing import List, Dict, Any
import logging
from app.routers.auth import verify_token, TokenData

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def list_api_endpoints(
    request: Request,
    token_data: TokenData = Depends(verify_token)
) -> List[Dict[str, Any]]:
    """List all API endpoints from FastAPI application"""
    try:
        # Get FastAPI app instance from request
        fastapi_app = request.app
        
        endpoints = []
        
        # Iterate through all routes
        for route in fastapi_app.routes:
            # Skip non-route objects
            if not hasattr(route, 'path') or not hasattr(route, 'methods'):
                continue
            
            # Get methods for this route
            methods = list(route.methods) if hasattr(route, 'methods') else []
            if 'HEAD' in methods:
                methods.remove('HEAD')
            if not methods:
                continue
            
            # Get route path
            path = route.path
            
            # Skip docs and openapi endpoints
            if path in ['/docs', '/redoc', '/openapi.json']:
                continue
            
            # Get endpoint function
            endpoint_func = route.endpoint if hasattr(route, 'endpoint') else None
            
            # Extract summary and description from docstring
            summary = None
            description = None
            if endpoint_func and hasattr(endpoint_func, '__doc__') and endpoint_func.__doc__:
                doc_lines = endpoint_func.__doc__.strip().split('\n')
                if doc_lines:
                    summary = doc_lines[0].strip()
                    if len(doc_lines) > 1:
                        description = '\n'.join(doc_lines[1:]).strip()
            
            # Get tags from route
            tags = []
            if hasattr(route, 'tags') and route.tags:
                tags = route.tags
            elif hasattr(route, 'endpoint') and hasattr(route.endpoint, '__self__'):
                # Try to get tags from router
                pass
            
            # Check if authentication is required (look for dependencies)
            requires_auth = False
            if hasattr(route, 'dependant') and route.dependant:
                for dependency in route.dependant.dependencies:
                    if hasattr(dependency, 'call') and 'verify_token' in str(dependency.call):
                        requires_auth = True
                        break
            
            # Get parameters from route
            parameters = []
            if hasattr(endpoint_func, '__annotations__'):
                # Try to extract parameters from function signature
                import inspect
                sig = inspect.signature(endpoint_func)
                for param_name, param in sig.parameters.items():
                    if param_name not in ['request', 'token_data', 'credentials']:
                        param_type = str(param.annotation) if param.annotation != inspect.Parameter.empty else 'string'
                        is_required = param.default == inspect.Parameter.empty
                        parameters.append({
                            'name': param_name,
                            'type': param_type,
                            'required': is_required
                        })
            
            endpoint_info = {
                'path': path,
                'methods': methods,
                'summary': summary,
                'description': description,
                'tags': tags,
                'requires_auth': requires_auth,
                'parameters': parameters
            }
            
            endpoints.append(endpoint_info)
        
        # Remove duplicates (same path with different methods should be merged)
        merged_endpoints = {}
        for ep in endpoints:
            key = ep['path']
            if key not in merged_endpoints:
                merged_endpoints[key] = ep
            else:
                # Merge methods
                merged_endpoints[key]['methods'].extend(ep['methods'])
                merged_endpoints[key]['methods'] = sorted(list(set(merged_endpoints[key]['methods'])))
                # Merge tags
                merged_endpoints[key]['tags'] = sorted(list(set(merged_endpoints[key]['tags'] + ep['tags'])))
        
        return list(merged_endpoints.values())
        
    except Exception as e:
        logger.error(f"Error listing API endpoints: {e}")
        return []

