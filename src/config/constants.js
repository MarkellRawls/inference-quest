export const GAME = Object.freeze({
  WIDTH: 1920,
  HEIGHT: 1080,
  GRAVITY: 900,
  PLAYER_SPEED: 380,
  JUMP_VELOCITY: -520,
  DOUBLE_JUMP_VELOCITY: -420,
  DASH_SPEED: 700,
  DASH_DURATION: 180,
  DASH_COOLDOWN: 800,
  ATTACK_RANGE: 110,
  ATTACK_COOLDOWN: 350,
  ATTACK_DAMAGE: 1,
  ZONE_TRANSITION_DURATION: 1500,
  COYOTE_TIME: 80,
  JUMP_BUFFER: 100,
});

export const ZONE_WORLDS = Object.freeze({
  PROMPT_VOID: { width: 7200, height: 2160 },
  API_GATEWAY: { width: 12000, height: 2160 },
  ROUTER_NEXUS: { width: 14400, height: 2160 },
  TOKENIZER_GROVE: { width: 9600, height: 2160 },
  EMBEDDING_NEBULA: { width: 9600, height: 2160 },
  ATTENTION_NEXUS: { width: 9600, height: 2160 },
  KV_CACHE_CAVERNS: { width: 9600, height: 2160 },
  DECODE_WATERFALL: { width: 1920, height: 12000 },
  RESPONSE_STREAM: { width: 9600, height: 2160 },
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
