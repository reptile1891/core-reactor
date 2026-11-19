const assert = require('node:assert/strict');
const C = require('../dist/engine');

function setup(save = C.freshSave()) {
  const engine = new C.Engine(save, {seed: 1});
  engine.nextSpawn = engine.nextAttack = engine.nextBoss = Infinity;
  engine.hp = 1;
  return engine;
}

function fire(engine, enemy, kind) {
  const group = engine.schedule(enemy, kind, {angle: Math.PI / 2});
  group.locked = true;
  group.arrival = engine.time;
  engine.fireGroup(group);
  return group;
}

const projectile = setup();
const gunner = projectile.addEnemy('gunner', Math.PI / 2);
fire(projectile, gunner, 'shot');
projectile.kill(gunner);
for (let i = 0; i < 120 && projectile.state === 'playing'; i++) projectile.update(.05);
assert.equal(projectile.state, 'dead');
assert.equal(projectile.deathCause.source, 'projectile');
assert.equal(projectile.deathCause.attacker.type, 'gunner');
assert.equal(projectile.deathCause.boss, null);

const laser = setup();
const boss = laser.addBoss(2);
fire(laser, boss, 'laser');
boss.phase = 3;
laser.update(.05);
assert.equal(laser.state, 'dead');
assert.equal(laser.deathCause.source, 'laser');
assert.equal(laser.deathCause.attacker.boss, 2);
assert.deepEqual(laser.deathCause.boss, {index: 2, phase: 3});

const save = C.freshSave();
save.tech.revive = 1;
const revived = setup(save);
revived.hitCore();
assert.equal(revived.hp, 1);
assert.equal(revived.state, 'playing');
assert.equal(revived.deathCause, undefined);
revived.barrier = revived.invuln = 0;
revived.hitCore(true);
assert.equal(revived.deathCause.source, 'suppressor');

console.log('Defeat: projectile attribution after attacker death, boss laser and phase, revive passed.');
