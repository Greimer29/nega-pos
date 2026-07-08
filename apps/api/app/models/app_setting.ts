import { AppSettingSchema } from '#database/schema'

export default class AppSetting extends AppSettingSchema {
  static table = 'app_settings'
}
