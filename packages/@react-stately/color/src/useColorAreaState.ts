/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {clamp, snapValueToStep} from '@react-aria/utils';
import {Color, ColorAreaProps, ColorChannel} from '@react-types/color';
import {normalizeColor, parseColor} from './Color';
import {useControlledState} from '@react-stately/utils';
import {useRef, useState} from 'react';

export interface ColorAreaState {
  /** The current color value displayed by the color area. */
  readonly value: Color,
  /** Sets the current color value. If a string is passed, it will be parsed to a Color. */
  setValue(value: string | Color): void,

  /** The current value of the horizontal axis channel displayed by the color area. */
  xValue: number,
  /** Sets the value for the horizontal axis channel displayed by the color area, and triggers `onChange`. */
  setXValue(value: number): void,

  /** The current value of the vertical axis channel displayed by the color area. */
  yValue: number,
  /** Sets the value for the vertical axis channel displayed by the color area, and triggers `onChange`. */
  setYValue(value: number): void,

  /** Sets the x and y channels of the current color value based on a percentage of the width and height of the color area, and triggers `onChange`. */
  setColorFromPoint(x: number, y: number): void,
  /** Returns the coordinates of the thumb relative to the upper left corner of the color area as a percentage. */
  getThumbPosition(): {x: number, y: number},

  /** Increments the value of the horizontal axis channel by the given amount (defaults to 1). */
  incrementX(minStepSize?: number): void,
  /** Decrements the value of the horizontal axis channel by the given amount (defaults to 1). */
  decrementX(minStepSize?: number): void,

  /** Increments the value of the vertical axis channel by the given amount (defaults to 1). */
  incrementY(minStepSize?: number): void,
  /** Decrements the value of the vertical axis channel by the given amount (defaults to 1). */
  decrementY(minStepSize?: number): void,

  /** Whether the color area is currently being dragged. */
  readonly isDragging: boolean,
  /** Sets whether the color area is being dragged. */
  setDragging(value: boolean): void,

  /** Returns the xChannel, yChannel and zChannel names based on the color value. */
  getChannels(): {xChannel: ColorChannel, yChannel: ColorChannel, zChannel: ColorChannel},

  /** Returns the color that should be displayed in the color area thumb instead of `value`. */
  getDisplayColor(): Color
}

const DEFAULT_COLOR = parseColor('hsb(0, 100%, 100%)');
const RGBSet: Set<ColorChannel> = new Set(['red', 'green', 'blue']);
let difference = (a: Set<ColorChannel>, b: Set<ColorChannel>): Set<ColorChannel> => new Set([...a].filter(x => !b.has(x)));
/**
 * Provides state management for a color area component.
 * Color area allows users to adjust two channels of an HSL, HSB or RGB color value against a two-dimensional gradient background.
 */
export function useColorAreaState(props: ColorAreaProps): ColorAreaState {
  let {value, defaultValue, xChannel, yChannel, onChange, onChangeEnd, xChannelStep = 1, yChannelStep = 1} = props;

  if (!value && !defaultValue) {
    defaultValue = DEFAULT_COLOR;
  }

  let [color, setColor] = useControlledState(value && normalizeColor(value), defaultValue && normalizeColor(defaultValue), onChange);
  let valueRef = useRef(color);
  valueRef.current = color;

  if (!xChannel) {
    switch (yChannel) {
      case 'red':
      case 'green':
        xChannel = 'blue';
        break;
      case 'blue':
        xChannel = 'red';
        break;
      default:
        xChannel = 'blue';
        yChannel = 'green';
    }
  } else if (!yChannel) {
    switch (xChannel) {
      case 'red':
        yChannel = 'green';
        break;
      case 'blue':
        yChannel = 'red';
        break;
      default:
        xChannel = 'blue';
        yChannel = 'green';
    }
  }
  let xyChannels: Set<ColorChannel> = new Set([xChannel, yChannel]);
  let zChannel = difference(RGBSet, xyChannels).values().next().value as ColorChannel;
  console.log('zChannel', zChannel)

  let channels = {xChannel, yChannel, zChannel};
  if (!xChannel || !yChannel) {
    xChannel = channels.xChannel;
    yChannel = channels.yChannel;
  }

  if (!xChannelStep) {
    xChannelStep = color.getChannelRange(xChannel).step;
  }

  if (!yChannelStep) {
    yChannelStep = color.getChannelRange(yChannel).step;
  }

  let [isDragging, setDragging] = useState(false);
  let isDraggingRef = useRef(false).current;

  let xValue = color.getChannelValue(xChannel);
  let yValue = color.getChannelValue(yChannel);
  let setXValue = (v: number) => setColor(color.withChannelValue(xChannel, v));
  let setYValue = (v: number) => setColor(color.withChannelValue(yChannel, v));

  return {
    channels,
    xChannelStep,
    yChannelStep,
    value: color,
    setValue(value) {
      let c = normalizeColor(value);
      valueRef.current = c;
      setColor(c);
    },
    xValue,
    setXValue,
    yValue,
    setYValue,
    setColorFromPoint(x: number, y: number) {
      let {minValue: minValueX, maxValue: maxValueX} = color.getChannelRange(xChannel);
      let {minValue: minValueY, maxValue: maxValueY} = color.getChannelRange(yChannel);
      let newXValue = minValueX + clamp(x, 0, 1) * (maxValueX - minValueX);
      let newYValue = minValueY + (1 - clamp(y, 0, 1)) * (maxValueY - minValueY);
      let newColor:Color;
      if (newXValue !== xValue) {
        // Round new value to multiple of step, clamp value between min and max
        newXValue = snapValueToStep(newXValue, minValueX, maxValueX, xChannelStep);
        newColor = color.withChannelValue(xChannel, newXValue);
      }
      if (newYValue !== yValue) {
        // Round new value to multiple of step, clamp value between min and max
        newYValue = snapValueToStep(newYValue, minValueY, maxValueY, yChannelStep);
        newColor = (newColor || color).withChannelValue(yChannel, newYValue);
      }
      if (newColor) {
        setColor(newColor);
      }
    },
    getThumbPosition() {
      let {minValue, maxValue} = color.getChannelRange(xChannel);
      let {minValue: minValueY, maxValue: maxValueY} = color.getChannelRange(yChannel);
      let x = (xValue - minValue) / (maxValue - minValue);
      let y = 1 - (yValue - minValueY) / (maxValueY - minValueY);
      return {x, y};
    },
    incrementX(minStepSize: number = 0) {
      let s = Math.max(minStepSize, xChannelStep);
      let {maxValue} = color.getChannelRange(xChannel);
      if (xValue < maxValue) {
        setXValue(Math.min(xValue + s, maxValue));
      }
    },
    incrementY(minStepSize: number = 0) {
      let s = Math.max(minStepSize, yChannelStep);
      let {maxValue} = color.getChannelRange(yChannel);
      if (yValue < maxValue) {
        setYValue(Math.min(yValue + s, maxValue));
      }
    },
    decrementX(minStepSize: number = 0) {
      let s = Math.max(minStepSize, xChannelStep);
      let {minValue} = color.getChannelRange(xChannel);
      if (xValue > minValue) {
        setXValue(Math.max(xValue - s, minValue));
      }
    },
    decrementY(minStepSize: number = 0) {
      let s = Math.max(minStepSize, yChannelStep);
      let {minValue} = color.getChannelRange(yChannel);
      if (yValue > minValue) {
        setYValue(Math.max(yValue - s, minValue));
      }
    },
    setDragging(isDragging) {
      let wasDragging = isDraggingRef;
      isDraggingRef = isDragging;

      if (onChangeEnd && !isDragging && wasDragging) {
        onChangeEnd(valueRef.current);
      }

      console.log('setDragging', isDragging)
      setDragging(isDragging);
    },
    isDragging,
    getDisplayColor() {
      return color.withChannelValue('alpha', 1);
    }
  };
}
