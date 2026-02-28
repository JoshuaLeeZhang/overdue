"""
Run the Browser Use agent with a fresh Chromium browser (Browser Use's LLM).
"""
import asyncio

from dotenv import load_dotenv
from browser_use import Agent, Browser, ChatBrowserUse

load_dotenv()

# Fresh Chromium – no system profile, no profile copy; uses Playwright's browser
browser = Browser()

# Browser Use's LLM (uses BROWSER_USE_API_KEY from .env) – same brain as cloud, local browser
llm = ChatBrowserUse()

agent = Agent(
    task='Go to http://learn.uwaterloo.ca/',
    browser=browser,
    llm=llm,
)


async def main():
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
