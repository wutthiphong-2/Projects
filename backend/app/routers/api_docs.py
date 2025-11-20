"""
API Documentation Router
Provides code examples and API documentation
"""
from fastapi import APIRouter, Query
from typing import Optional
from pydantic import BaseModel

router = APIRouter()


class CodeExample(BaseModel):
    """Code example for API endpoint"""
    language: str
    label: str
    code: str
    description: Optional[str] = None


class EndpointExample(BaseModel):
    """Code examples for an endpoint"""
    endpoint: str
    method: str
    description: str
    examples: list[CodeExample]


@router.get("/code-examples", response_model=list[EndpointExample])
async def get_code_examples(
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    language: Optional[str] = Query(None, description="Filter by language (curl, python, javascript)")
):
    """Get code examples for API endpoints"""
    
    base_url = "https://api.example.com"  # TODO: Get from config
    
    examples = [
        {
            "endpoint": "/api/users",
            "method": "GET",
            "description": "Get list of users",
            "examples": [
                {
                    "language": "curl",
                    "label": "cURL",
                    "code": f"""curl -X GET "{base_url}/api/users" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json\"""",
                    "description": "Get all users"
                },
                {
                    "language": "python",
                    "label": "Python",
                    "code": f"""import requests

url = "{base_url}/api/users"
headers = {{
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}}

response = requests.get(url, headers=headers)
data = response.json()
print(data)""",
                    "description": "Get all users using Python requests"
                },
                {
                    "language": "javascript",
                    "label": "JavaScript (Fetch)",
                    "code": f"""const url = "{base_url}/api/users";
const headers = {{
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}};

fetch(url, {{ method: "GET", headers }})
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error("Error:", error));""",
                    "description": "Get all users using JavaScript Fetch API"
                }
            ]
        },
        {
            "endpoint": "/api/users",
            "method": "POST",
            "description": "Create a new user",
            "examples": [
                {
                    "language": "curl",
                    "label": "cURL",
                    "code": f"""curl -X POST "{base_url}/api/users" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "cn": "John Doe",
    "sAMAccountName": "jdoe",
    "mail": "jdoe@example.com",
    "department": "IT"
  }}'""",
                    "description": "Create a new user"
                },
                {
                    "language": "python",
                    "label": "Python",
                    "code": f"""import requests

url = "{base_url}/api/users"
headers = {{
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}}
data = {{
    "cn": "John Doe",
    "sAMAccountName": "jdoe",
    "mail": "jdoe@example.com",
    "department": "IT"
}}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)""",
                    "description": "Create a new user using Python"
                },
                {
                    "language": "javascript",
                    "label": "JavaScript (Fetch)",
                    "code": f"""const url = "{base_url}/api/users";
const headers = {{
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}};
const data = {{
    cn: "John Doe",
    sAMAccountName: "jdoe",
    mail: "jdoe@example.com",
    department: "IT"
}};

fetch(url, {{
    method: "POST",
    headers,
    body: JSON.stringify(data)
}})
    .then(response => response.json())
    .then(result => console.log(result))
    .catch(error => console.error("Error:", error));""",
                    "description": "Create a new user using JavaScript"
                }
            ]
        },
        {
            "endpoint": "/api/groups",
            "method": "GET",
            "description": "Get list of groups",
            "examples": [
                {
                    "language": "curl",
                    "label": "cURL",
                    "code": f"""curl -X GET "{base_url}/api/groups" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json\"""",
                    "description": "Get all groups"
                },
                {
                    "language": "python",
                    "label": "Python",
                    "code": f"""import requests

url = "{base_url}/api/groups"
headers = {{
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}}

response = requests.get(url, headers=headers)
groups = response.json()
print(groups)""",
                    "description": "Get all groups using Python"
                }
            ]
        }
    ]
    
    # Filter by endpoint if provided
    if endpoint:
        examples = [e for e in examples if endpoint in e["endpoint"]]
    
    # Filter by language if provided
    if language:
        for example in examples:
            example["examples"] = [
                ex for ex in example["examples"] 
                if ex["language"] == language
            ]
    
    return examples


@router.get("/quick-start")
async def get_quick_start():
    """Get quick start guide"""
    return {
        "title": "API Quick Start Guide",
        "steps": [
            {
                "step": 1,
                "title": "Get Your API Key",
                "description": "Create an API key from the API Management page",
                "code": "# Go to API Management > Create API Key"
            },
            {
                "step": 2,
                "title": "Make Your First Request",
                "description": "Use your API key in the Authorization header",
                "code": """curl -X GET "https://api.example.com/api/users" \\
  -H "Authorization: Bearer YOUR_API_KEY" """
            },
            {
                "step": 3,
                "title": "Check Rate Limits",
                "description": "Monitor your rate limit using response headers",
                "code": """X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200"""
            }
        ],
        "base_url": "https://api.example.com",
        "authentication": {
            "type": "Bearer Token",
            "header": "Authorization: Bearer YOUR_API_KEY"
        },
        "rate_limits": {
            "default": "100 requests per minute",
            "headers": [
                "X-RateLimit-Limit: Maximum requests allowed",
                "X-RateLimit-Remaining: Requests remaining",
                "X-RateLimit-Reset: Unix timestamp when limit resets"
            ]
        }
    }

