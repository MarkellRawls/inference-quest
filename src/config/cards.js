export const ZONE_CARDS = {
  PROMPT_VOID: {
    title: 'The Prompt',
    concept: 'You survived the void. Every AI interaction starts with a prompt, and you are that prompt. The raw input that will travel through the entire inference pipeline, being transformed at each stage until it becomes a response. The Syntax Corruptor tried to scramble you into nonsense, but your signal held.',
    details: [
      'Prompts can be simple questions or complex multi-turn conversations',
      'The quality of the prompt directly affects the quality of the response',
      'System prompts set the behavior, user prompts provide the task',
    ],
    funFact: 'Modern LLMs can process prompts with hundreds of thousands of tokens, equivalent to several novels.',
  },
  API_GATEWAY: {
    title: 'The API Gateway',
    concept: 'You breached the gateway. Before any prompt reaches an AI model, it must pass through this fortified entrance. Authentication, rate limiting, request routing: the Rate Limit Guardian enforced them all, and you slipped through its defenses. Now your request is authorized and queued.',
    details: [
      'API keys and OAuth tokens verify your identity',
      'Rate limiters prevent any single user from overwhelming the system',
      'Request queues ensure fair ordering under high load',
      'The gateway is your first line of defense against abuse',
    ],
    funFact: 'Major AI providers handle millions of API requests per minute. Without rate limiting, a single runaway script could degrade service for everyone.',
  },
  ROUTER_NEXUS: {
    title: 'Inference Routing & llm-d',
    concept: 'You conquered the Overload Sentinel and the routing is optimized. The router is the brain of the serving infrastructure, and llm-d is the scheduler that makes it sing. It decided which GPU node gets your request based on current load, cached data, and your characteristics. Your journey through the inference pipeline is complete.',
    details: [
      'Load-aware routing sends requests to the least busy GPU nodes',
      'Prefix-aware scheduling (llm-d) routes requests to nodes that already have relevant KV cache data',
      'Cache hits can skip the expensive prefill phase entirely',
      'Disaggregated serving separates prefill and decode across specialized node pools',
    ],
    funFact: 'llm-d (LLM Daemon) is an open-source Kubernetes-native inference routing system that can reduce time-to-first-token by 5-10x through intelligent KV cache-aware scheduling.',
  },
  TOKENIZER_GROVE: {
    title: 'Tokenization',
    concept: 'AI models don\'t read words -- they read tokens. The tokenizer breaks your text into subword pieces that the model understands. Common words stay whole, but rare words get split into smaller pieces.',
    details: [
      'BPE (Byte-Pair Encoding) is the most common tokenization algorithm',
      'Common words like "the" are single tokens; rare words split into subwords',
      'A typical vocabulary has 32K-128K unique tokens',
      'Tokenization determines the true "length" of your prompt',
    ],
    funFact: 'The word "tokenization" itself might be split into ["token", "ization"] -- two tokens instead of one!',
  },
  EMBEDDING_NEBULA: {
    title: 'Embeddings',
    concept: 'Each token gets transformed into a high-dimensional vector -- a list of numbers that captures its meaning. In this vector space, words with similar meanings cluster together, and relationships between words become geometric operations.',
    details: [
      'Embedding dimensions range from 768 to 12,288+ numbers per token',
      'Similar words (like "happy" and "joyful") are close together in vector space',
      'The famous example: king - man + woman = queen works in embedding space',
      'Position embeddings tell the model where each token appears in the sequence',
    ],
    funFact: 'A single GPT-4 class model\'s embedding table can contain over 1 billion parameters just for converting tokens to vectors.',
  },
  ATTENTION_NEXUS: {
    title: 'Self-Attention',
    concept: 'The attention mechanism is the heart of transformer models. Each token looks at every other token and decides how much to "pay attention" to it. This is how the model understands context -- "bank" means something different near "river" vs "money."',
    details: [
      'Query, Key, Value (Q, K, V) matrices compute attention scores',
      'Multi-head attention runs multiple attention patterns in parallel',
      'Each head can learn different types of relationships (syntax, semantics, position)',
      'Attention complexity scales quadratically with sequence length',
    ],
    funFact: 'The 2017 paper "Attention Is All You Need" that introduced transformers has been cited over 100,000 times -- it literally changed the world.',
  },
  KV_CACHE_CAVERNS: {
    title: 'KV Cache',
    concept: 'During generation, the model stores Key and Value tensors from previous tokens so it doesn\'t recompute them. This KV cache is what makes token-by-token generation fast -- but it consumes massive amounts of GPU memory.',
    details: [
      'Without KV cache, generating each new token would require reprocessing all previous tokens',
      'KV cache can consume 1-2 GB per request for long conversations',
      'Cache eviction policies (LRU, LFU) decide what to keep when memory is full',
      'PagedAttention (vLLM) manages KV cache like virtual memory pages',
    ],
    funFact: 'For a 70B parameter model with a 128K context window, the KV cache alone can require over 40 GB of GPU memory -- more than many GPUs even have!',
  },
  DECODE_WATERFALL: {
    title: 'Token Decoding',
    concept: 'The model generates one token at a time. For each position, it produces a probability distribution over its entire vocabulary. The sampling strategy (temperature, top-k, top-p) determines which token gets selected from those probabilities.',
    details: [
      'Temperature controls randomness: low = predictable, high = creative',
      'Top-k sampling limits choices to the k most likely tokens',
      'Top-p (nucleus) sampling keeps tokens until cumulative probability reaches p',
      'Greedy decoding always picks the highest probability -- fast but repetitive',
    ],
    funFact: 'At temperature 0, the model is deterministic. At temperature 2, it\'s practically writing surrealist poetry. Most APIs default to 0.7 -- creative but coherent.',
  },
  RESPONSE_STREAM: {
    title: 'Response Streaming',
    concept: 'Rather than waiting for the entire response to generate, modern APIs stream tokens back as they\'re produced. Each token is sent via Server-Sent Events (SSE) the moment it\'s decoded, giving you that characteristic word-by-word appearance.',
    details: [
      'Streaming reduces perceived latency -- you see the first word in milliseconds',
      'Server-Sent Events (SSE) provide a lightweight streaming protocol',
      'Detokenization converts token IDs back into readable text',
      'Time-to-first-token (TTFT) is a key performance metric for inference systems',
    ],
    funFact: 'The "typing" effect you see in ChatGPT isn\'t artificial -- it\'s genuinely streaming tokens as they\'re generated, typically 30-100 tokens per second.',
  },
};
