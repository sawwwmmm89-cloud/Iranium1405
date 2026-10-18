export interface LiveJoinInfo {
  /** Embeddable player URL (provider-defined). Never contains long-lived secrets. */
  embedUrl: string;
}

export interface LiveProvider {
  readonly name: string;
  getJoinInfo(input: { liveClassId: string; providerRef: string; userId: string }): Promise<LiveJoinInfo>;
}
