import type { KyInstance } from 'ky';

/** Resource types registered with the forum service. */
export type CommentType = string;
export type CommentStatus = 0 | 1 | 2;
export type CommentStatusName = 'published' | 'hidden' | 'deleted';

export interface Comment {
  id: number;
  subjectKey: string;
  rootId: number | null;
  content: string;
  authorId: number;
  authorUsername: string;
  /** Whether the current viewer has blocked this author. */
  authorBlocked: boolean;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  /** First 20 replies, included in root comment lists. */
  replies?: CommentPage;
}

export interface CommentPage {
  total: number;
  items: Comment[];
}

export interface CommentListParams {
  page: number;
  pageSize: number;
}

export interface CreateCommentRequest {
  content: string;
  rootId?: number;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface ForumApiOptions {
  /** ky instance configured with the caller's authentication strategy. */
  client: KyInstance;
  /** Forum service origin, for example `https://forum.example.com/`. */
  url: string;
  /** Resource type whose comments this instance manages. */
  type: CommentType;
}

/**
 * Creates a client for comments attached to third-party resources.
 * A dedicated client is derived without altering the caller's ky instance.
 */
export function createForumApi(options: ForumApiOptions) {
  const client = options.client.extend({
    prefix: new URL('api/v1/', options.url).toString(),
  });
  const commentPath = `external/comment/${encodeURIComponent(options.type)}`;

  return {
    async setUserBlocked(userId: number, blocked: boolean) {
      const path = `me/blacklist/${userId}`;
      await (blocked ? client.put(path) : client.delete(path));
    },
    getComments(
      subjectKey: string,
      params: CommentListParams,
      signal?: AbortSignal,
    ) {
      return client
        .get(`${commentPath}/${encodeURIComponent(subjectKey)}`, {
          searchParams: {
            page: params.page,
            page_size: params.pageSize,
          },
          signal,
        })
        .json<CommentPage>();
    },
    getReplies(
      subjectKey: string,
      rootId: number,
      params: CommentListParams,
      signal?: AbortSignal,
    ) {
      return client
        .get(
          `${commentPath}/${encodeURIComponent(subjectKey)}/${rootId}/reply`,
          {
            searchParams: {
              page: params.page,
              page_size: params.pageSize,
            },
            signal,
          },
        )
        .json<CommentPage>();
    },
    createComment(subjectKey: string, request: CreateCommentRequest) {
      return client
        .post(`${commentPath}/${encodeURIComponent(subjectKey)}`, {
          json: request,
        })
        .json<Comment>();
    },
    updateComment(commentId: number, request: UpdateCommentRequest) {
      return client
        .patch(`${commentPath}/${commentId}`, { json: request })
        .json<Comment>();
    },
    async deleteComment(commentId: number) {
      await client.delete(`${commentPath}/${commentId}`);
    },
    async setCommentStatus(commentId: number, status: CommentStatusName) {
      await client.put(`${commentPath}/${commentId}/status`, {
        json: { status },
      });
    },
  };
}

export type ForumApi = ReturnType<typeof createForumApi>;
