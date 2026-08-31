import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable, startWith, Subject } from 'rxjs';

@Injectable()
export class RecipeEventsService {
  private readonly changes = new Subject<MessageEvent>();

  emit(type: string, data: object) {
    this.changes.next({ type, data });
  }

  stream(): Observable<MessageEvent> {
    const heartbeat = interval(15_000).pipe(
      map(() => ({ type: 'heartbeat', data: { at: Date.now() } })),
    );
    return merge(this.changes.asObservable(), heartbeat).pipe(
      startWith({ type: 'connected', data: { at: Date.now() } }),
    );
  }
}
