# Integration Examples

Because GuardLayer exposes an OpenAI-compatible interface, you can integrate it into existing AI applications by changing only 2 lines of code (the base URL and the API key).

---

## Python OpenAI SDK

### Before
```python
import openai

client = openai.OpenAI(
    api_key="your-openai-api-key"
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### After (GuardLayer Integrated)
```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:8080/v1",  # Route through GuardLayer gateway
    api_key="your-guardlayer-api-key"      # Use API key created in GuardLayer dashboard
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

---

## JavaScript OpenAI SDK

### Before
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your-openai-api-key',
});

const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(completion.choices[0].message.content);
```

### After (GuardLayer Integrated)
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:8080/v1',  // Route through GuardLayer gateway
  apiKey: 'your-guardlayer-api-key',      // GuardLayer API Key
});

const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(completion.choices[0].message.content);
```

---

## Python LangChain

Configure the standard `ChatOpenAI` model instances to point to GuardLayer:

```python
from langchain_openai import ChatOpenAI

chat = ChatOpenAI(
    openai_api_base="http://localhost:8080/v1",  # Route through GuardLayer gateway
    openai_api_key="your-guardlayer-api-key",      # GuardLayer API Key
    model_name="gpt-3.5-turbo"
)

response = chat.predict("Introduce yourself.")
print(response)
```

---

## JavaScript LangChain

```javascript
import { ChatOpenAI } from "@langchain/openai";

const chat = new ChatOpenAI({
  configuration: {
    baseURL: "http://localhost:8080/v1",
  },
  openAIApiKey: "your-guardlayer-api-key",
  modelName: "gpt-3.5-turbo",
});

const response = await chat.predict("Introduce yourself.");
console.log(response);
```

---

## Python LlamaIndex

For LlamaIndex agents, configure the LLM module globally:

```python
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

# Overwrite default OpenAI settings globally
Settings.llm = OpenAI(
    api_base="http://localhost:8080/v1",
    api_key="your-guardlayer-api-key",
    model="gpt-3.5-turbo"
)

# Application usage remains completely unchanged
```

---

## Generic Compatibility Guide

Any application, service, or workflow platform (such as Flowise, Langflow, Dify, etc.) that supports custom API endpoints using the **OpenAI Chat Completions** format can integrate with GuardLayer by setting:

1. **Endpoint / Base URL**: `http://localhost:8080/v1`
2. **API Key / Authorization**: Bearer token created in the GuardLayer dashboard keys page.
3. **Model Selection**: Any string (the target provider routing model mapping is resolved internally by GuardLayer based on active scope settings).
