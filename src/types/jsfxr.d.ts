declare module "jsfxr" {
  interface SfxAudio {
    play: () => unknown;
    setVolume: (v: number) => SfxAudio;
    channels?: unknown[];
  }
  interface SfxrApi {
    toAudio: (synthdef: string | object) => SfxAudio;
    play: (synthdef: string | object) => unknown;
  }
  export const sfxr: SfxrApi;
  const _default: { sfxr: SfxrApi };
  export default _default;
}
