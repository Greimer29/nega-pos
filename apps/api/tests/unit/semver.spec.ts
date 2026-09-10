import { compareSemver, isSemverNewer, normalizeSemver } from '#utils/semver'
import { test } from '@japa/runner'

test.group('semver', () => {
  test('normalizeSemver strips v prefix', ({ assert }) => {
    assert.equal(normalizeSemver('v1.2.1'), '1.2.1')
    assert.equal(normalizeSemver('1.2.1'), '1.2.1')
  })

  test('compareSemver orders versions', ({ assert }) => {
    assert.isBelow(compareSemver('1.2.0', '1.2.1'), 0)
    assert.isAbove(compareSemver('1.3.0', '1.2.9'), 0)
    assert.equal(compareSemver('v1.2.1', '1.2.1'), 0)
  })

  test('isSemverNewer detects updates', ({ assert }) => {
    assert.isTrue(isSemverNewer('1.2.2', '1.2.1'))
    assert.isFalse(isSemverNewer('1.2.1', '1.2.1'))
    assert.isFalse(isSemverNewer('1.2.0', '1.2.1'))
  })
})
