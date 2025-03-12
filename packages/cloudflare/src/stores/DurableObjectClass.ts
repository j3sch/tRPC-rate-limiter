import { DurableObject } from 'cloudflare:workers'
import type { ClientRateLimitInfo } from '@trpc-rate-limiter/hono'

const initialState: ClientRateLimitInfo = {
  totalHits: 0,
}

export class DurableObjectRateLimiter extends DurableObject {
  value() {
    return this.ctx.storage.get<ClientRateLimitInfo>('value')
  }

  async update(hits: number, windowMs: number) {
    let payload = (await this.ctx.storage.get<ClientRateLimitInfo>('value')) || initialState
    let alarmTimestamp = await this.ctx.storage.getAlarm()
    const currentTime = Date.now()

    if (!alarmTimestamp) {
      alarmTimestamp = currentTime + windowMs
      await this.ctx.storage.setAlarm(alarmTimestamp)
    }

    // if windowMs is changed while the alarm is active, the alarm will not be reset (bug)
    if (alarmTimestamp <= currentTime) {
      await this.reset()
      payload = { totalHits: 0 }
      alarmTimestamp = currentTime + windowMs
      await this.ctx.storage.setAlarm(alarmTimestamp)
    }

    payload = {
      totalHits: payload.totalHits + hits,
      resetTime: new Date(alarmTimestamp),
    }

    await this.ctx.storage.put('value', payload)
    return payload
  }

  async reset() {
    await this.ctx.storage.put('value', initialState)
  }

  override async alarm() {
    await this.reset()
  }
}
