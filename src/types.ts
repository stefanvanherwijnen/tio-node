interface StreamDescription {
  streamSourceId: number
  streamFlags: number
  streamPeriod: number
  streamOffset: number
}
export interface Stream {
  streamId: number
  streamTimebaseId: number
  streamPeriod: number
  streamOffset: number
  streamSampleNumber: number
  streamTotalComponents: number
  streamFlags: number
  streamDescription: Array<StreamDescription>
}

export interface Source {
  sourceId: number
  sourceTimeBaseId: number
  sourcePeriod: number
  sourceOffset: number
  sourceFmt: number
  sourceFlags: number
  sourceChannels: number
  sourceType: number
  description: string
}
export interface Timebase {
  timebaseId: number
  timebaseSource: number
  timebaseEpoch: number
  timebaseStartTime: BigInt
  timebasePeriodNumUs: number
  timebasePeriodDenomUs: number
  timebaseFlags: number
  timebaseStabilityPpb: number
  timebaseSrcParams: Array<number>
}