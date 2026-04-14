'use client'

import { createContext } from "react";
import s from './style.module.scss';
import cs from 'classnames';

const TypoContext = createContext({});

interface TypoMainProps {
    children: React.ReactNode;
}

function TypoMain(props: TypoMainProps) {
    return (
        <TypoContext.Provider value={props}>
            {props.children}
        </TypoContext.Provider>
    )
}

type ColorType = 'primary' | 'secondary' | 'inverted' | 'brand' | 'correct' | 'wrong' | 'background-secondary' | 'background-third' | 'border' | (string & {});
type FontWeightType = 'light' | 'regular' | 'medium' | 'semi-bold' | 'bold';

interface TypoProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    color?: ColorType;
    fontWeight?: FontWeightType;
    onClick?: () => void;
}

const getTypoClass = (color?: ColorType, fontWeight?: FontWeightType) => {
    // Only return class if the color matches a predefined style key
    const isPredefinedColor = color && !!s[color as keyof typeof s];
    return cs(
        isPredefinedColor ? s[color as keyof typeof s] : undefined,
        fontWeight && s[fontWeight]
    );
}

const getTypoStyle = (color?: ColorType, style?: React.CSSProperties) => {
    // If color is provided but not in predefined styles, apply it as inline style
    const isPredefinedColor = color && !!s[color as keyof typeof s];
    if (color && !isPredefinedColor) {
        return { ...style, color };
    }
    return style;
}

function XXS({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 10, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

function XS({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 12, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

function SM({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 14, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

function MD({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 16, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

function LG({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 20, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

function XL({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 24, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

function XXL({ children, className, style, color, fontWeight, onClick }: TypoProps) {
    return (
        <p className={cs(className, getTypoClass(color, fontWeight))} style={{ fontSize: 36, ...getTypoStyle(color, style) }} onClick={onClick}>
            {children}
        </p>
    )
}

const Typo = Object.assign(TypoMain, {
    XXS,
    XS,
    SM,
    MD,
    LG,
    XL,
    XXL,
})

export default Typo