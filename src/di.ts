/**
 * Service Container – Dependency Injection via lazy singletons.
 *
 * Instantiated once per request. Each getter lazily creates the service +
 * its repository, so unused services pay zero cost.
 *
 * This follows the **Dependency Inversion Principle**: route handlers depend
 * on the container interface, not on concrete repository/service classes.
 *
 * Usage in a route handler:
 *   const services = new ServiceContainer(c.env);
 *   const post = await services.posts.getById("abc");
 */

import type { Bindings } from "@/core/types";
import { createDb, type Database } from "@/db";
import { AuthRepository } from "@/features/auth/data/auth.repository";
import { AuthService } from "@/features/auth/core/auth.service";
import { PostsRepository } from "@/features/posts/data/posts.repository";
import { PostsService } from "@/features/posts/core/posts.service";
import { ABTestingRepository } from "@/features/ab-testing/data/ab-testing.repository";
import { ABTestingService } from "@/features/ab-testing/core/ab-testing.service";

export class ServiceContainer {
  private db: Database;
  private env: Bindings;

  // Cached instances (lazy singleton per request)
  private _auth?: AuthService;
  private _posts?: PostsService;
  private _abTesting?: ABTestingService;

  constructor(env: Bindings) {
    this.env = env;
    this.db = createDb(env.DB);
  }

  get auth(): AuthService {
    if (!this._auth) {
      this._auth = new AuthService(new AuthRepository(this.db), this.env);
    }
    return this._auth;
  }

  get posts(): PostsService {
    if (!this._posts) {
      this._posts = new PostsService(new PostsRepository(this.db));
    }
    return this._posts;
  }

  get abTesting(): ABTestingService {
    if (!this._abTesting) {
      this._abTesting = new ABTestingService(new ABTestingRepository(this.db));
    }
    return this._abTesting;
  }
}
