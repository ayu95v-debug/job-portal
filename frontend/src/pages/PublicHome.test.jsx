import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import PublicHome from "./PublicHome";

jest.mock("axios");
jest.mock("../components/Navbar", () => () => <div data-testid="navbar" />);
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("PublicHome", () => {
  beforeEach(() => {
    localStorage.clear();
    axios.get.mockResolvedValue({ data: [] });
  });

  it("loads jobs from the configured backend API", async () => {
    render(<PublicHome />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("https://job-portal-omfp.onrender.com/api/jobs");
    });
  });
});
