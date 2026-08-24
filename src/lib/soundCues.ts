/**
 * Sound-cue architecture only — no audio files exist yet. Per the standing
 * media-approval protocol used throughout this project (see
 * public/assets/3d/LICENSES.md's history), no audio asset gets sourced or
 * downloaded without an explicit approval step; this manifest exists so
 * the playback engine (useCinematicAudio.ts) has real named slots to wire
 * up the moment licensed audio is supplied, instead of retrofitting cue
 * points later.
 */
export interface SoundCue {
  id: string;
  label: string;
  /** Scene key(s) this cue plays under — see cinematicManifest.ts. */
  scenes: string[];
  description: string;
}

export const SOUND_CUES: SoundCue[] = [
  { id: 'ambience', label: 'Dubai Ambience', scenes: ['black'], description: 'Near-silent distant city hum, wind. Bookends with "silence".' },
  { id: 'score', label: 'Cinematic Score Entrance', scenes: ['dubai-reveal'], description: 'Sparse, restrained atmospheric introduction — piano/pad, no percussion yet.' },
  { id: 'vehicle', label: 'Vehicle Presence', scenes: ['vehicle'], description: 'Subtle near-silent electric hum, not a combustion roar.' },
  { id: 'shopper-cue', label: 'Shopper Intelligence Cue', scenes: ['shopper-intent'], description: 'A single restrained, almost bell-like tone — "the city heard you".' },
  { id: 'merchant-cue', label: 'Merchant Response Cue', scenes: ['merchant-activation'], description: 'A second, answering tone — call-and-response with the shopper cue.' },
  { id: 'delivery', label: 'Delivery Momentum', scenes: ['delivery'], description: 'Rhythmic pulse enters, tempo picks up fractionally.' },
  { id: 'network-climax', label: 'Network Climax', scenes: ['living-network', 'climax'], description: 'Arrangement expands into the full emotional/musical peak.' },
  { id: 'silence', label: 'Silence', scenes: ['silence'], description: 'Hard drop to near-silence — the emotional reset before the brand reveal.' },
  { id: 'sting', label: 'Brand Sting', scenes: ['brand-reveal'], description: 'A single restrained musical punctuation under "THIS IS RESMART."' },
];
