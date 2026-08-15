import logo from "../../assets/images/excwa-logo.png";

export default function ExcwaLogo({ size = 32, className = "", style = {} }) {
  return (
    <img
      src={logo}
      alt="EXCWA"
      className={className}
      style={{
        width: size,
        height: "auto",
        objectFit: "contain",
        display: "block",
        ...style,
      }}
    />
  );
}
