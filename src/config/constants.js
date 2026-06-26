export const GAME = Object.freeze({
  WIDTH: 1920,
  HEIGHT: 1080,
  PLAYER_SPEED: 420,
  PLAYER_FLOAT_SPEED: 280,
  DASH_SPEED: 850,
  DASH_DURATION: 200,
  DASH_COOLDOWN: 1000,
  ZONE_TRANSITION_DURATION: 1500,
});

export const ZONE_WORLDS = Object.freeze({
  PROMPT_VOID: { width: 4800, height: 1080 },
  API_GATEWAY: { width: 9600, height: 1080 },
  ROUTER_NEXUS: { width: 12000, height: 1080 },
  TOKENIZER_GROVE: { width: 9600, height: 1080 },
  EMBEDDING_NEBULA: { width: 9600, height: 1080 },
  ATTENTION_NEXUS: { width: 9600, height: 1080 },
  KV_CACHE_CAVERNS: { width: 9600, height: 1080 },
  DECODE_WATERFALL: { width: 1920, height: 9600 },
  RESPONSE_STREAM: { width: 9600, height: 1080 },
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
