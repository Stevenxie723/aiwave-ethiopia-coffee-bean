import urllib.request
import json
import os

def lambda_handler(event, context):
    #query = event.get('query', 'What is AWS Lambda?')
    try:
        query = event['node']['inputs'][0]['value']
    except:
        query = "What is AWS Lambda?"
    print("================== Input Check ==================")
    print(type(event))
    print(event)
    print("=============================================")
    api_key = "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"
    
    url = "https://api.tavily.com/search"
    headers = {'Content-Type': 'application/json'}
    data = {
        "api_key": api_key,
        "query": query,
        "search_depth": "advanced",
        "include_answer": True,
        "max_results": 5
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    print("================== Output Check ==================")
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(result)
            return result['answer']
    except Exception as e:
        return {'statusCode': 500, 'body': str(e)}
    print("=============================================")