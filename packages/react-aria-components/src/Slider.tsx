import {AriaSliderProps, mergeProps, useFocusRing, useNumberFormatter, useSlider, useSliderThumb, VisuallyHidden} from 'react-aria';
import {AriaSliderThumbProps} from '@react-types/slider';
import {DOMAttributes, Orientation} from '@react-types/shared';
import {LabelContext} from './Label';
import {mergeRefs} from '@react-aria/utils';
import {Provider, RenderProps, useRenderProps, useSlot} from './utils';
import React, {createContext, ForwardedRef, forwardRef, OutputHTMLAttributes, RefObject, useContext, useRef} from 'react';
import {SliderState, useSliderState} from 'react-stately';

interface SliderProps extends AriaSliderProps, RenderProps<SliderState> {
  /**
   * The display format of the value label.
   */
   formatOptions?: Intl.NumberFormatOptions
}

interface SliderContextValue {
  state: SliderState,
  trackProps: DOMAttributes,
  outputProps: OutputHTMLAttributes<HTMLOutputElement>,
  trackRef: RefObject<HTMLDivElement>
}

const InternalSliderContext = createContext<SliderContextValue>(null);

export interface SliderRenderProps {
  /**
   * The orientation of the slider.
   * @selector [data-orientation="horizontal | vertical"]
   */
  orientation: Orientation,
  /**
   * Whether the slider is disabled.
   * @selector [data-disabled]
   */
  isDisabled: boolean
}

function Slider(props: SliderProps, ref: ForwardedRef<HTMLDivElement>) {
  let trackRef = useRef(null);
  let numberFormatter = useNumberFormatter(props.formatOptions);
  let state = useSliderState({...props, numberFormatter});
  let [labelRef, label] = useSlot();
  let {
    groupProps,
    trackProps,
    labelProps,
    outputProps
  } = useSlider({...props, label}, state, trackRef);

  let renderProps = useRenderProps({
    ...props,
    values: state,
    defaultClassName: 'react-aria-Slider'
  });

  return (
    <Provider
      values={[
        [InternalSliderContext, {state, trackProps, trackRef, outputProps}],
        [LabelContext, {...labelProps, ref: labelRef}]
      ]}>
      <div
        {...groupProps}
        {...renderProps}
        ref={ref}
        data-orientation={state.orientation}
        data-disabled={state.isDisabled || undefined} />
    </Provider>
  );
}

const _Slider = forwardRef(Slider);
export {_Slider as Slider};

interface SliderOutputProps extends RenderProps<SliderState> {}

function SliderOutput({children, style, className}: SliderOutputProps, ref: ForwardedRef<HTMLOutputElement>) {
  let {state, outputProps} = useContext(InternalSliderContext);
  let renderProps = useRenderProps({
    className,
    style,
    children,
    defaultChildren: state.getThumbValueLabel(0),
    defaultClassName: 'react-aria-SliderOutput',
    values: state
  });

  return <output {...outputProps} {...renderProps} ref={ref} />;
}

const _SliderOutput = forwardRef(SliderOutput);
export {_SliderOutput as SliderOutput};

interface SliderTrackProps extends RenderProps<SliderState> {}

function SliderTrack({children, style, className}: SliderTrackProps, ref: ForwardedRef<HTMLDivElement>) {
  let {state, trackProps, trackRef} = useContext(InternalSliderContext);
  let domRef = mergeRefs(ref, trackRef);
  let renderProps = useRenderProps({
    className,
    style,
    children,
    defaultClassName: 'react-aria-SliderTrack',
    values: state
  });

  return <div {...trackProps} {...renderProps} ref={domRef} />;
}

const _SliderTrack = forwardRef(SliderTrack);
export {_SliderTrack as SliderTrack};

export interface SliderThumbRenderProps {
  /** The slider state object. */
  state: SliderState,
  /**
   * Whether this thumb is currently being dragged.
   * @selector [data-dragging]
   */
  isDragging: boolean,
  /**
   * Whether the thumb is currently focused.
   * @selector [data-focused]
   */
  isFocused: boolean,
  /**
   * Whether the thumb is keyboard focused.
   * @selector [data-focus-visible]
   */
  isFocusVisible: boolean,
  /**
   * Whether the thumb is disabled.
   * @selector [data-disabled]
   */
  isDisabled: boolean
}

interface SliderThumbProps extends AriaSliderThumbProps, RenderProps<SliderThumbRenderProps> {}

function SliderThumb(props: SliderThumbProps, ref: ForwardedRef<HTMLDivElement>) {
  let {state, trackRef} = useContext(InternalSliderContext);
  let {index = 0} = props;
  let inputRef = useRef(null);
  let [labelRef, label] = useSlot();
  let {thumbProps, inputProps, labelProps, isDragging, isFocused, isDisabled} = useSliderThumb({
    index,
    trackRef,
    inputRef,
    label
  }, state);

  let {focusProps, isFocusVisible} = useFocusRing();

  let renderProps = useRenderProps({
    className: props.className,
    style: props.style,
    children: props.children,
    defaultClassName: 'react-aria-SliderThumb',
    values: {state, isDragging, isFocused, isFocusVisible, isDisabled}
  });

  return (
    <div
      {...thumbProps}
      {...renderProps}
      ref={ref}
      style={{...thumbProps.style, ...renderProps.style}}
      data-dragging={isDragging || undefined}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}>
      <VisuallyHidden>
        <input ref={inputRef} {...mergeProps(inputProps, focusProps)} />
      </VisuallyHidden>
      <Provider
        values={[
          [LabelContext, {...labelProps, ref: labelRef}]
        ]}>
        {renderProps.children}
      </Provider>
    </div>
  );
}

const _SliderThumb = forwardRef(SliderThumb);
export {_SliderThumb as SliderThumb};
