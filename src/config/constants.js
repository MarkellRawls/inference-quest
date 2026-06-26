export const GAME = Object.freeze({
  WIDTH: 1280,
  HEIGHT: 720,
  PLAYER_SPEED: 300,
  PLAYER_FLOAT_SPEED: 200,
  DASH_SPEED: 600,
  DASH_DURATION: 200,
  DASH_COOLDOWN: 1000,
  ZONE_TRANSITION_DURATION: 1500,
});

export const ZONE_WORLDS = Object.freeze({
  PROMPT_VOID: { width: 3200, height: 720 },
  API_GATEWAY: { width: 6400, height: 720 },
  ROUTER_NEXUS: { width: 8000, height: 720 },
  TOKENIZER_GROVE: { width: 6400, height: 720 },
  EMBEDDING_NEBULA: { width: 6400, height: 720 },
  ATTENTION_NEXUS: { width: 6400, height: 720 },
  KV_CACHE_CAVERNS: { width: 6400, height: 720 },
  DECODE_WATERFALL: { width: 1280, height: 6400 },
  RESPONSE_STREAM: { width: 6400, height: 720 },
});

export const SCENES = Object.freeze({
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  ZONE1: 'Zone1_PromptVoid',
  ZONE2: 'Zone2_APIGateway',
  ZONE3: 'Zone3_RouterNexus',
  ZONE4: 'Zone4_TokenizerGrove',
  ZONE5: 'Zone5_EmbeddingNebula',
  ZONE6: 'Zone6_AttentionNexus',
  ZONE7: 'Zone7_KVCacheCaverns',
  ZONE8: 'Zone8_DecodeWaterfall',
  ZONE9: 'Zone9_ResponseStream',
  INFO_CARD: 'InfoCardScene',
});
