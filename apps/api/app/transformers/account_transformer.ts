import type Account from '#models/account'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AccountTransformer extends BaseTransformer<Account> {
  toObject() {
    return {
      id: Number(this.resource.id),
      name: this.resource.name,
      description: this.resource.description,
      isActive: Boolean(this.resource.isActive),
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}

export function serializeAccount(account: Account) {
  return new AccountTransformer(account).toObject()
}

export function serializeAccountResumen(account: Account) {
  return {
    id: Number(account.id),
    name: account.name,
    isActive: Boolean(account.isActive),
  }
}
