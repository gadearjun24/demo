import asyncio
import json
import uuid
import os
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import List
import aio_pika

app = FastAPI(title="RabbitMQ LLM Streamer")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
JOB_QUEUE_NAME = "llm_jobs"

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

async def get_rabbitmq_connection():
    return await aio_pika.connect_robust(RABBITMQ_URL)

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    1. Connects to RabbitMQ.
    2. Creates a temporary, exclusive 'Reply Queue' for this specific user.
    3. Sends the job to the Workers.
    4. Listens to the Reply Queue and streams results via SSE.
    """
    connection = await get_rabbitmq_connection()
    channel = await connection.channel()

    # A. Create a temporary queue just for THIS request (The "Phone Line")
    # auto_delete=True means it vanishes when the connection closes.
    reply_queue = await channel.declare_queue("", exclusive=True, auto_delete=True)

    # B. Prepare the Payload
    job_payload = json.dumps({
        "history": [msg.model_dump() for msg in request.messages],
        "max_tokens": 512
    }).encode()

    # C. Publish Job to the Main Queue
    # We tell the worker: "Reply to 'reply_queue.name'"
    await channel.default_exchange.publish(
        aio_pika.Message(
            body=job_payload,
            reply_to=reply_queue.name,  # <--- The worker needs this to talk back
            correlation_id=str(uuid.uuid4())
        ),
        routing_key=JOB_QUEUE_NAME
    )

    # D. Stream the responses back to the user
    async def event_generator():
        try:
            # Listen to the private reply queue
            async with reply_queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process():
                        token = message.body.decode()
                        
                        # Stop signal from worker
                        if token == "[DONE]":
                            break
                            
                        yield token
        finally:
            await connection.close()

    return EventSourceResponse(event_generator())
