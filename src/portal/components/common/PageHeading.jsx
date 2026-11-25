export default function PageHeading({ kicker, title, description, aside }) {
  return (
    <div className="page-heading">
      <div className="heading-main">
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h1>{title}</h1>
        {description && <p className="heading-description">{description}</p>}
      </div>
      {aside && <div className="heading-aside">{aside}</div>}
    </div>
  );
}
