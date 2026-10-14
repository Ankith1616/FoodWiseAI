from ai.pipelines.train_all_models import train_model2_autoencoder, train_model3_ncf_matcher

if __name__ == "__main__":
    train_model2_autoencoder(epochs=30)
    train_model3_ncf_matcher(epochs=30)
