// 右上角的 ⋮ 按钮，Home 和 Report 共用
export default function MenuButton({ onClick }) {
  return (
    <span
      onClick={onClick}
      role="button"
      aria-label="menu"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        fontSize: 22,
        lineHeight: 1,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      ⋮
    </span>
  );
}
