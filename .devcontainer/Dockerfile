FROM node:22

# Install basic development tools
RUN apt-get update && apt-get install -y --no-install-recommends less sudo \
    && rm -rf /var/lib/apt/lists/*

# Ensure default `node` user has access to `sudo`
ARG USERNAME=node
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# listen on all interfaces inside the container
ENV HOST=0.0.0.0
