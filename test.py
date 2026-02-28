import asyncio
import os

from dotenv import load_dotenv
from browser_use_sdk import AsyncBrowserUse

load_dotenv()  # load .env into os.environ
api_key = os.environ.get("BROWSER_USE_API_KEY")

async def main():
    client = AsyncBrowserUse(api_key=api_key)
    browser = await client.browsers.create(proxy_country_code="us")


asyncio.run(main())