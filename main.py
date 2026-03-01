import asyncio
from dedalus_labs import AsyncDedalus, DedalusRunner
from dedalus_labs.utils.stream import stream_async

async def main():
    client = AsyncDedalus()
    runner = DedalusRunner(client)
    response = await runner.run(
        input="Go to Hacker News, find the top 5 stories, and summarize each one",
        model=["openai/gpt-5.2", "anthropic/claude-opus-4-6"],
        mcp_servers=["aryanma/browser-use-mcp", "tsion/exa"],
        stream=True,
    )
    await stream_async(response)

if __name__ == "__main__":
    asyncio.run(main())

