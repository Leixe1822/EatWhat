import type { ReactNode } from 'react'
import styles from './FoodMapIllustration.module.css'

const ink = '#242824'
const cream = '#FFF6DF'
const orange = '#F6A04D'

// 每個圖釘共用外框與圓形底；外層決定位置，內層只負責上下浮動。
function FoodPin({ x, y, scale = 1, delay, children }: {
  x: number
  y: number
  scale?: number
  delay: string
  children: ReactNode
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="8" cy="94" rx="33" ry="10" fill={ink} opacity="0.18" />
      <g className={styles.pin} style={{ animationDelay: delay }}>
        <path d="M7 98 C-10 78 -57 29 -57 0 A64 64 0 1 1 71 0 C71 29 24 78 7 98Z" fill={ink} stroke="none" />
        <path d="M0 90 C-17 70 -64 21 -64 -8 A64 64 0 1 1 64 -8 C64 21 17 70 0 90Z" fill={orange} />
        <circle cy="-10" r="49" fill={cream} />
        {children}
      </g>
    </g>
  )
}

// 純裝飾 SVG：道路延伸至邊界，圖示與圖釘使用同一座標系統等比例縮放。
export default function FoodMapIllustration() {
  return (
    <svg className={styles.illustration} viewBox="0 0 540 600" fill="none"
      stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path fill="#D3F36A" stroke="none" d="M0 0H540V600H0Z" />
      {/* 先畫粗黑道路，再覆蓋米白線條，交叉路口不會出現多餘的分隔線。 */}
      {[46, 38].map((width) => (
        <g key={width} stroke={width === 46 ? ink : cream} strokeWidth={width}>
          <path d="M330 -30 243 167 265 275 187 416 133 630" />
          <path d="M-30 126 243 199 570 107" />
          <path d="M-30 370 175 303 353 351 570 275" />
          <path d="M-30 555 187 451 570 563" />
          <path d="M459 -20 410 153M353 351 431 522" />
        </g>
      ))}
      {/* 米白襯底讓探索虛線在道路及綠地上都保持清楚。 */}
      <path d="M118 181 C59 265 124 282 209 264 M231 355 C116 380 134 440 228 433 S270 514 396 497"
        stroke={cream} strokeWidth="15" />
      <path d="M118 181 C59 265 124 282 209 264 M231 355 C116 380 134 440 228 433 S270 514 396 497"
        strokeWidth="5" strokeDasharray="10 13" />

      <FoodPin x={116} y={116} scale={0.75} delay="-1.3s">
        {/* 拉麵：碗、麵條、筷子與蒸氣。 */}
        <path d="M-34 -8 Q-30 25 0 25 Q30 25 34 -8Z" fill={orange} />
        <ellipse cy="-8" rx="34" ry="10" fill={cream} />
        <path d="M-20 -9 Q-8 -22 2 -8 M-7 -9 Q5 -24 16 -8 M9 -12 Q23 -23 15 -35 M18 -12 Q32 -25 24 -37" strokeWidth="3" />
        <path d="M13 -33 39 -44 M16 -27 42 -38" strokeWidth="4" />
        <path d="M-22 -25 Q-30 -30 -23 -36 M-10 -29 Q-17 -36 -10 -42" strokeWidth="3" />
        <path d="M-15 26H15" />
      </FoodPin>
      <FoodPin x={104} y={441} scale={0.72} delay="-3.5s">
        {/* 漢堡：麵包、蔬菜與起司。 */}
        <path d="M-32 -13 A32 28 0 0 1 32 -13Z" fill={orange} />
        <path d="M-31 -4  -19 1 -7 -4 6 1 19 -4 31 0" stroke="#657C35" strokeWidth="6" />
        <path d="M-30 7H30" strokeWidth="10" />
        <path d="M-17 4 0 15 17 4" fill="#D3F36A" strokeWidth="3" />
        <path d="M-31 16H31 Q33 28 23 28H-23 Q-33 28 -31 16Z" fill={orange} />
        <path d="M-15 -24h1 M0 -30h1 M15 -23h1" strokeWidth="3" />
      </FoodPin>
      <FoodPin x={423} y={465} scale={0.73} delay="-2.4s">
        {/* 咖啡：杯子與兩道蒸氣。 */}
        <path d="M26 -14H33 C52 -14 48 10 26 10" fill={cream} />
        <path d="M-28 -16H28 L23 8 Q19 26 0 26 Q-19 26 -23 8Z" fill={cream} />
        <ellipse cy="-16" rx="28" ry="6" fill={ink} />
        <path d="M-29 31H29 M-10 -29 C-21 -39 1 -40 -8 -49 M9 -28 C-1 -38 21 -39 12 -48" />
      </FoodPin>
      <FoodPin x={294} y={285} scale={1.32} delay="0s">
        {/* 中央主圖釘：叉子與湯匙。 */}
        <g strokeWidth="6">
          <path d="M-26 -35V-14 Q-26 -3 -15 -3 Q-4 -3 -4 -14V-35 M-15 -35V32" />
          <ellipse cx="22" cy="-20" rx="11" ry="20" fill={ink} strokeWidth="3" />
          <path d="M22 -5V32" />
        </g>
      </FoodPin>
      {/* 少量短線強調主圖釘，其他區域保留留白。 */}
      <path d="M324 167 328 148 M350 178 362 162 M370 199 387 191" strokeWidth="7" />
    </svg>
  )
}
