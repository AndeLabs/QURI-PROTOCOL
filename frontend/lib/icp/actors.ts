import { ActorSubclass } from '@dfinity/agent';
import { createActor } from './agent';
import { idlFactory as runeEngineIdl } from './idl/rune-engine.idl';
import { RuneEngineService } from '@/types/canisters';

const RUNE_ENGINE_CANISTER_ID =
  process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';

export function getRuneEngineActor(): ActorSubclass<RuneEngineService> {
  return createActor<RuneEngineService>(RUNE_ENGINE_CANISTER_ID, runeEngineIdl);
}
