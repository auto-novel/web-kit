import assert from 'node:assert/strict';
import test from 'node:test';
import * as Vue from 'vue';
import { parseDate } from '@internationalized/date';
import * as styleClasses from '../../src/ui/classes.ts';
import * as field from '../../src/ui/field.ts';
import { useOverlayLayer } from '../../src/ui/overlayLayer.ts';
import { compileComponent } from '../helpers/compile-component.mjs';
import { createTestRenderer, dispatch } from '../helpers/test-renderer.mjs';

function mount(t, initial = {}) {
  const controls = {};
  function stub(name, tag, keys = []) {
    return {
      props: keys,
      setup(props, { attrs, emit, slots }) {
        controls[name] = { props, emit };
        return () =>
          Vue.h(tag, attrs, slots.default?.({ grid: [], weekDays: [] }));
      },
    };
  }
  const pass = (_, { slots }) => slots.default?.();
  const reka = {
    PopoverRoot: stub('popover', 'section', ['open']),
    PopoverTrigger: stub('trigger', 'button', ['disabled']),
    PopoverPortal: pass,
    PopoverContent: stub('content', 'article'),
    RangeCalendarRoot: stub('calendar', 'main', [
      'modelValue',
      'locale',
      'calendarLabel',
      'minValue',
      'maxValue',
      'disabled',
      'readonly',
    ]),
  };
  for (const name of [
    'Header',
    'Heading',
    'Prev',
    'Next',
    'Grid',
    'GridHead',
    'GridBody',
    'GridRow',
    'HeadCell',
    'Cell',
    'CellTrigger',
  ])
    reka[`RangeCalendar${name}`] = pass;
  const icon = () => Vue.h('svg');
  const Component = compileComponent(
    new URL(
      '../../src/ui/date-range-picker/XDateRangePicker.vue',
      import.meta.url,
    ),
    {
      vue: Vue,
      'reka-ui': reka,
      '@internationalized/date': { parseDate },
      '@vicons/material': {
        CalendarMonthOutlined: icon,
        ChevronLeftOutlined: icon,
        ChevronRightOutlined: icon,
        CloseOutlined: icon,
      },
      '../classes': styleClasses,
      '../field': field,
      '../overlayLayer': { useOverlayLayer },
    },
  );
  const props = Vue.reactive({ ...initial });
  const events = [];
  const { createApp, mount: mountApp } = createTestRenderer(t);
  const { root } = mountApp(
    createApp({
      render: () =>
        Vue.h(Component, {
          ...props,
          'onUpdate:modelValue': (value) => {
            props.modelValue = value;
            events.push(value);
          },
        }),
    }),
  );
  function nodes(tag, node = root) {
    return [
      node,
      ...node.children.flatMap((child) => nodes(tag, child)),
    ].filter((child) => child.tag === tag);
  }
  return { controls, props, events, nodes };
}

test('日期区间只提交完整 ISO 日期，不提交选择中间态，选完关闭弹层', async (t) => {
  const { controls, events, props } = mount(t);
  assert.equal(controls.calendar.props.calendarLabel, '日期区间');
  controls.popover.emit('update:open', true);
  await Vue.nextTick();
  controls.calendar.emit('update:modelValue', {
    start: parseDate('2026-10-20'),
    end: undefined,
  });
  await Vue.nextTick();
  assert.deepEqual(events, []);
  assert.equal(controls.popover.props.open, true);
  controls.calendar.emit('update:modelValue', {
    start: parseDate('2026-10-20'),
    end: parseDate('2026-10-23'),
  });
  await Vue.nextTick();
  assert.deepEqual(events, [['2026-10-20', '2026-10-23']]);
  assert.deepEqual(props.modelValue, ['2026-10-20', '2026-10-23']);
  assert.equal(controls.popover.props.open, false);
});

test('外部更新与取消未完成选择会同步日历；清空提交 null', async (t) => {
  const { controls, props, events, nodes } = mount(t, {
    modelValue: ['2026-10-01', '2026-10-03'],
    clearable: true,
  });
  controls.popover.emit('update:open', true);
  await Vue.nextTick();
  controls.calendar.emit('update:modelValue', {
    start: parseDate('2026-10-20'),
    end: undefined,
  });
  controls.popover.emit('update:open', false);
  await Vue.nextTick();
  assert.equal(
    controls.calendar.props.modelValue.start.toString(),
    '2026-10-01',
  );
  props.modelValue = ['2026-09-01', '2026-09-30'];
  await Vue.nextTick();
  assert.equal(controls.calendar.props.modelValue.end.toString(), '2026-09-30');
  dispatch(
    nodes('button').find((node) => node.props['aria-label'] === '清空日期区间'),
    'click',
  );
  await Vue.nextTick();
  assert.deepEqual(events, [null]);
  assert.equal(controls.calendar.props.modelValue.start, undefined);
});

test('范围约束透传给 Reka，属性落触发器，禁用与只读拒绝更新', async (t) => {
  const { controls, props, events, nodes } = mount(t, {
    min: '2026-01-01',
    max: '2026-12-31',
    locale: 'en-US',
    'aria-label': '创建日期',
    invalid: true,
    class: 'w-80',
    disabled: true,
  });
  assert.equal(controls.calendar.props.minValue.toString(), '2026-01-01');
  assert.equal(controls.calendar.props.maxValue.toString(), '2026-12-31');
  assert.equal(controls.calendar.props.locale, 'en-US');
  assert.equal(controls.calendar.props.calendarLabel, '创建日期');
  assert.equal(nodes('button')[0].props['aria-label'], '创建日期');
  assert.equal(nodes('button')[0].props['aria-invalid'], true);
  assert.ok(!nodes('button')[0].props.class.includes('w-80'));
  const range = {
    start: parseDate('2026-10-20'),
    end: parseDate('2026-10-23'),
  };
  assert.equal(controls.trigger.props.disabled, true);
  controls.calendar.emit('update:modelValue', range);
  assert.deepEqual(events, []);
  props.disabled = false;
  props.readonly = true;
  await Vue.nextTick();
  // 只读允许打开查看，选择能力交给日历自身的 readonly。
  assert.equal(controls.trigger.props.disabled, false);
  assert.equal(controls.calendar.props.readonly, true);
  controls.calendar.emit('update:modelValue', range);
  assert.deepEqual(events, []);
});
