const PlayerNameTag = ({ name, country }) => {
    const countryFlag = (country === 'Unknown') ? '🏳️' : country.toUpperCase()
        .split('')
        .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join('');

    console.log(country);
    return (
        <div>
            {name ? (
                <div className="text-lg font-medium text-gray-800">
                    {countryFlag} {name}
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    )
}

export default PlayerNameTag