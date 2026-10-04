import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://3.109.209.102:5000/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        return response.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError("Unable to load products");
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">

      {/* Navbar */}
      <header className="navbar">
        <div className="logo">🛒 SaurabKart</div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search products..."
          />
          <button>Search</button>
        </div>

        <button className="nav-button">Login</button>
        <button className="nav-button">🛒 Cart</button>
      </header>

      {/* Categories */}
      <nav className="categories">
        <span>Electronics</span>
        <span>Mobiles</span>
        <span>Fashion</span>
        <span>Accessories</span>
        <span>Deals</span>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1>Welcome to SaurabKart</h1>
        <p>Everything you need, all in one place.</p>
        <button className="shop-button">
          Shop Now
        </button>
      </section>

      {/* Products */}
      <section className="products-section">
        <h2>Popular Products</h2>

        {loading && (
          <p className="status">
            Loading products...
          </p>
        )}

        {error && (
          <p className="status error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="products">

            {products.map((product) => (
              <div
                className="product-card"
                key={product._id}
              >
                <div className="product-image">
                  🛍️
                </div>

                <h3>{product.name}</h3>

                <p>
                  {product.description}
                </p>

                <strong>
                  ₹{product.price}
                </strong>

                <button>
                  Add to Cart
                </button>
              </div>
            ))}

          </div>
        )}
      </section>

    </div>
  );
}

export default App;
