import type { KyInstance } from 'ky';

interface BanUserRequest {
  username: string;
  reason: string;
}

interface CreateStrikeRequest extends BanUserRequest {
  evidence: string;
  point: number;
}

export interface MyStrike {
  id: number;
  reason: string;
  evidence: string;
  point: number;
  createdAt: string;
  revokedAt?: string;
}

export interface MyStrikePage {
  total: number;
  items: MyStrike[];
  latestStrikeId: number;
}

export interface MyStrikeListParams {
  page: number;
  pageSize: number;
  createdAfter?: number;
  createdBefore?: number;
}

export interface StrikeReadState {
  hasUnread: boolean;
}

export interface AttentionStatus {
  strikes: StrikeReadState;
}

export function createAuthApi(client: KyInstance) {
  return {
    async banUser(request: BanUserRequest) {
      await client.post('admin/user/ban', { json: request });
    },
    async createStrike(request: CreateStrikeRequest) {
      await client.post('admin/strikes', { json: request });
    },
    getMyStrikes(params: MyStrikeListParams) {
      return client
        .get('me/strikes', {
          searchParams: {
            page: params.page,
            page_size: params.pageSize,
            created_after: params.createdAfter,
            created_before: params.createdBefore,
          },
        })
        .json<MyStrikePage>();
    },
    getAttentionStatus() {
      return client.get('me/attention-status').json<AttentionStatus>();
    },
    updateMyStrikeReadState(throughId: number) {
      return client
        .put('me/strikes/read-state', { json: { throughId } })
        .json<StrikeReadState>();
    },
  };
}
